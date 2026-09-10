import type { Binding } from "./binding";
import type { Constructor, TokenResolver, TokensForArgs } from "./constructor";
import { instantiate } from "./constructor";
import {
  CircularDependencyError,
  findTokenSuggestions,
  MissingTokenError,
} from "./errors";
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
    const target = binding.provider as Constructor<T, unknown[]>;
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
