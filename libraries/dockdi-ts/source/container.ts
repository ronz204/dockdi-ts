import type { Binding, BindingBuilder, ScopedBindingBuilder } from "./binding";
import type { Constructor } from "./constructor";
import type { Token } from "./token";

export class Container {
  private readonly registry = new Map<Token<unknown>, Binding<unknown>>();
  private readonly singletonCache = new Map<Token<unknown>, unknown>();

  bind<T>(token: Token<T>): BindingBuilder<T> {
    if (this.registry.has(token as Token<unknown>)) {
      throw new Error(
        `Token already bound: ${token.description ?? token.toString()}`,
      );
    }

    const createScopedBuilder = (
      binding: Binding<unknown>,
    ): ScopedBindingBuilder => ({
      inSingletonScope: (): void => {
        binding.scope = "singleton";
      },
      inTransientScope: (): void => {
        binding.scope = "transient";
      },
      inResolutionScope: (): void => {
        binding.scope = "resolution";
      },
    });

    return {
      toClass: (target, tokens): ScopedBindingBuilder => {
        const binding: Binding<unknown> = {
          type: "class",
          scope: "transient",
          provider: target,
          dependencies: tokens as readonly Token<unknown>[],
        };
        this.registry.set(token as Token<unknown>, binding);
        return createScopedBuilder(binding);
      },
      toValue: (value: T): void => {
        this.registry.set(token as Token<unknown>, {
          type: "value",
          scope: "transient",
          provider: value,
        });
      },
      toFactory: (factory, tokens): ScopedBindingBuilder => {
        const binding: Binding<unknown> = {
          type: "factory",
          scope: "transient",
          provider: factory,
          dependencies: tokens as readonly Token<unknown>[],
        };
        this.registry.set(token as Token<unknown>, binding);
        return createScopedBuilder(binding);
      },
    };
  }

  get<T>(token: Token<T>): T {
    const resolutionContext = new Map<Token<unknown>, unknown>();
    return this.resolveToken(token, resolutionContext);
  }

  reset(): void {
    this.singletonCache.clear();
  }

  private resolveToken<T>(
    token: Token<T>,
    resolutionContext: Map<Token<unknown>, unknown>,
  ): T {
    const tokenKey = token as Token<unknown>;
    const binding = this.registry.get(tokenKey);
    if (!binding) {
      throw new Error(
        `Token not registered: ${token.description ?? token.toString()}`,
      );
    }

    if (binding.type === "value") {
      return binding.provider as T;
    }

    if (binding.scope === "singleton" && this.singletonCache.has(tokenKey)) {
      return this.singletonCache.get(tokenKey) as T;
    }

    if (binding.scope === "resolution" && resolutionContext.has(tokenKey)) {
      return resolutionContext.get(tokenKey) as T;
    }

    let instance: T;

    if (binding.type === "class") {
      const target = binding.provider as Constructor<T, unknown[]>;
      const deps = (binding.dependencies ?? []) as readonly Token<unknown>[];
      const resolvedArgs = deps.map((dep) =>
        this.resolveToken(dep, resolutionContext),
      );
      instance = new target(...resolvedArgs);
    } else if (binding.type === "factory") {
      const factory = binding.provider as (...args: unknown[]) => T;
      const deps = (binding.dependencies ?? []) as readonly Token<unknown>[];
      const resolvedArgs = deps.map((dep) =>
        this.resolveToken(dep, resolutionContext),
      );
      instance = factory(...resolvedArgs);
    } else {
      throw new Error(
        `Unsupported binding type: ${(binding as Binding<unknown>).type}`,
      );
    }

    if (binding.scope === "singleton") {
      this.singletonCache.set(tokenKey, instance);
    } else if (binding.scope === "resolution") {
      resolutionContext.set(tokenKey, instance);
    }

    return instance;
  }
}
