import type { Constructor } from "@core/assembler";
import type { Binding } from "@core/binding";
import type { Token } from "@core/token";
import {
  CircularDependencyError,
  DockdiError,
  InstantiationError,
  MissingTokenError,
} from "@errors/catalog";
import { findTokenSuggestions } from "@errors/suggest";
import { ResolutionCache, type SingletonCache } from "./caching";

class ResolutionContext {
  public readonly stack: Token<unknown>[] = [];
  public readonly set: Set<Token<unknown>> = new Set();
  public readonly cache: ResolutionCache = new ResolutionCache();
}

export class Resolver {
  constructor(
    private readonly registry: Map<Token<unknown>, Binding<unknown>>,
    private readonly singletons: SingletonCache,
  ) {}

  public resolve<T>(token: Token<T>): T {
    return this.resolveWithContext(token, new ResolutionContext());
  }

  private resolveWithContext<T>(
    token: Token<T>,
    context: ResolutionContext,
  ): T {
    const key = token as Token<unknown>;

    if (context.set.has(key)) {
      const cycle = [...context.stack.slice(context.stack.indexOf(key)), key];
      throw new CircularDependencyError(cycle);
    }

    const binding = this.registry.get(key);
    if (!binding) {
      const suggestions = findTokenSuggestions(key, this.registry);
      throw new MissingTokenError(key, context.stack, suggestions);
    }

    if (binding.type === "value") {
      return binding.provider as T;
    }

    if (binding.scope === "singleton") {
      return this.singletons.remember(token, () =>
        this.execute<T>(binding, key, context),
      );
    }

    if (binding.scope === "resolution") {
      return context.cache.remember(token, () =>
        this.execute<T>(binding, key, context),
      );
    }

    return this.execute<T>(binding, key, context);
  }

  private execute<T>(
    binding: Binding<unknown>,
    key: Token<unknown>,
    context: ResolutionContext,
  ): T {
    context.stack.push(key);
    context.set.add(key);

    try {
      const args =
        binding.deps?.map((dep) => this.resolveWithContext(dep, context)) ?? [];

      try {
        return binding.type === "class"
          ? new (binding.provider as Constructor<T, unknown[]>)(...args)
          : (binding.provider as (...args: unknown[]) => T)(...args);
      } catch (cause) {
        if (cause instanceof DockdiError) throw cause;
        throw new InstantiationError(key, context.stack.slice(0, -1), cause);
      }
    } finally {
      context.stack.pop();
      context.set.delete(key);
    }
  }
}
