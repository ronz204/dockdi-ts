import type { Binding } from "./binding";
import type { Constructor, TokenResolver, TokensForArgs } from "./constructor";
import { instantiate } from "./constructor";
import { tokenNotRegisteredError } from "./errors";
import type { Token } from "./token";

export function resolveToken<T>(
  token: Token<T>,
  registry: Map<Token<unknown>, Binding<unknown>>,
  singletonCache: Map<Token<unknown>, unknown>,
  resolutionContext: Map<Token<unknown>, unknown>,
): T {
  const tokenKey = token as Token<unknown>;
  const binding = registry.get(tokenKey);
  if (!binding) {
    throw tokenNotRegisteredError(tokenKey);
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

  const resolve: TokenResolver = (dep) =>
    resolveToken(dep, registry, singletonCache, resolutionContext);

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
