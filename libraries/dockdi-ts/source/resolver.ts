import type { Assembler, TokenResolver, TokensForArgs } from "./core/assembler";
import { instantiate } from "./core/assembler";
import type { Binding } from "./core/binding";
import {
  AsyncBindingError,
  CircularDependencyError,
  MissingTokenError,
} from "./errors/catalog";
import { findTokenSuggestions } from "./errors/suggest";
import type { Token } from "./token";

export function resolveToken<T>(
  token: Token<T>,
  registry: Map<Token<unknown>, Binding<unknown>>,
  singletonCache: Map<Token<unknown>, unknown>,
  resolutionContext: Map<Token<unknown>, unknown>,
  activeStack: readonly Token<unknown>[] = [],
): T {
  const tokenKey = token as Token<unknown>;

  const existingIndex = activeStack.indexOf(tokenKey);
  if (existingIndex !== -1) {
    const cyclePath = [...activeStack.slice(existingIndex), tokenKey];
    throw new CircularDependencyError(cyclePath);
  }

  const binding = registry.get(tokenKey);
  if (!binding) {
    const suggestions = findTokenSuggestions(tokenKey, registry);
    throw new MissingTokenError(tokenKey, activeStack, suggestions);
  }

  if (binding.type === "async") {
    throw new AsyncBindingError(tokenKey, activeStack);
  }

  if (binding.type === "value") {
    return binding.provider as T;
  }

  const cache =
    binding.scope === "singleton"
      ? singletonCache
      : binding.scope === "resolution"
        ? resolutionContext
        : undefined;

  if (cache?.has(tokenKey)) {
    return cache.get(tokenKey) as T;
  }

  const nextStack = [...activeStack, tokenKey];

  const resolve: TokenResolver = (dep) =>
    resolveToken(dep, registry, singletonCache, resolutionContext, nextStack);

  let instance: T;

  if (binding.type === "class") {
    const target = binding.provider as Assembler<T, unknown[]>;
    const deps = (binding.dependencies ?? []) as TokensForArgs<unknown[]>;
    instance = instantiate(target, deps, resolve);
  } else {
    const factory = binding.provider as (...args: unknown[]) => T;
    const deps = (binding.dependencies ?? []) as readonly Token<unknown>[];
    instance = factory(...deps.map(resolve));
  }

  cache?.set(tokenKey, instance);

  return instance;
}

export function resolveTokenAsync<T>(
  token: Token<T>,
  registry: Map<Token<unknown>, Binding<unknown>>,
  singletonCache: Map<Token<unknown>, unknown>,
  asyncSingletonCache: Map<Token<unknown>, Promise<unknown>>,
  resolutionContext: Map<Token<unknown>, unknown>,
  activeStack: readonly Token<unknown>[] = [],
): Promise<T> {
  const tokenKey = token as Token<unknown>;

  const existingIndex = activeStack.indexOf(tokenKey);
  if (existingIndex !== -1) {
    const cyclePath = [...activeStack.slice(existingIndex), tokenKey];
    return Promise.reject(new CircularDependencyError(cyclePath));
  }

  const binding = registry.get(tokenKey);
  if (!binding) {
    const suggestions = findTokenSuggestions(tokenKey, registry);
    return Promise.reject(
      new MissingTokenError(tokenKey, activeStack, suggestions),
    );
  }

  if (binding.type === "value") {
    return Promise.resolve(binding.provider as T);
  }

  if (binding.scope === "singleton" && singletonCache.has(tokenKey)) {
    return Promise.resolve(singletonCache.get(tokenKey) as T);
  }

  if (binding.scope === "resolution" && resolutionContext.has(tokenKey)) {
    return Promise.resolve(resolutionContext.get(tokenKey) as T);
  }

  if (binding.scope === "singleton" && asyncSingletonCache.has(tokenKey)) {
    return asyncSingletonCache.get(tokenKey) as Promise<T>;
  }

  const nextStack = [...activeStack, tokenKey];

  const resolutionTask = (async (): Promise<T> => {
    try {
      const resolveAsyncDep = (dep: Token<unknown>): Promise<unknown> =>
        resolveTokenAsync(
          dep,
          registry,
          singletonCache,
          asyncSingletonCache,
          resolutionContext,
          nextStack,
        );

      const deps = (binding.dependencies ?? []) as readonly Token<unknown>[];
      const resolvedDeps = await Promise.all(deps.map(resolveAsyncDep));

      let instance: T;
      if (binding.type === "class") {
        const target = binding.provider as Assembler<T, unknown[]>;
        instance = new target(...resolvedDeps);
      } else if (binding.type === "factory") {
        const factory = binding.provider as (...args: unknown[]) => T;
        instance = factory(...resolvedDeps);
      } else {
        const factory = binding.provider as (
          ...args: unknown[]
        ) => Promise<T> | T;
        instance = await factory(...resolvedDeps);
      }

      if (binding.scope === "singleton") {
        singletonCache.set(tokenKey, instance);
        asyncSingletonCache.delete(tokenKey);
      } else if (binding.scope === "resolution") {
        resolutionContext.set(tokenKey, instance);
      }

      return instance;
    } catch (err) {
      if (binding.scope === "singleton") {
        asyncSingletonCache.delete(tokenKey);
      }
      throw err;
    }
  })();

  if (binding.scope === "singleton") {
    asyncSingletonCache.set(tokenKey, resolutionTask);
  }

  return resolutionTask;
}
