import type { Binding, BindingBuilder } from "./binding";
import type { Constructor } from "./constructor";
import type { Token } from "./token";

export class Container {
  private readonly registry = new Map<Token<unknown>, Binding<unknown>>();

  bind<T>(token: Token<T>): BindingBuilder<T> {
    if (this.registry.has(token as Token<unknown>)) {
      throw new Error(
        `Token already bound: ${token.description ?? token.toString()}`,
      );
    }

    return {
      toClass: (target, tokens) => {
        this.registry.set(token as Token<unknown>, {
          type: "class",
          scope: "transient",
          provider: target,
          dependencies: tokens as readonly Token<unknown>[],
        });
      },
      toValue: (value: T) => {
        this.registry.set(token as Token<unknown>, {
          type: "value",
          scope: "transient",
          provider: value,
        });
      },
      toFactory: (factory, tokens) => {
        this.registry.set(token as Token<unknown>, {
          type: "factory",
          scope: "transient",
          provider: factory,
          dependencies: tokens as readonly Token<unknown>[],
        });
      },
    };
  }

  get<T>(token: Token<T>): T {
    const binding = this.registry.get(token as Token<unknown>);
    if (!binding) {
      throw new Error(
        `Token not registered: ${token.description ?? token.toString()}`,
      );
    }

    if (binding.type === "value") {
      return binding.provider as T;
    }

    if (binding.type === "class") {
      const target = binding.provider as Constructor<T, unknown[]>;
      const deps = (binding.dependencies ?? []) as readonly Token<unknown>[];
      const resolvedArgs = deps.map((dep) => this.get(dep));
      return new target(...resolvedArgs);
    }

    if (binding.type === "factory") {
      const factory = binding.provider as (...args: unknown[]) => T;
      const deps = (binding.dependencies ?? []) as readonly Token<unknown>[];
      const resolvedArgs = deps.map((dep) => this.get(dep));
      return factory(...resolvedArgs);
    }

    throw new Error(
      `Unsupported binding type: ${(binding as Binding<unknown>).type}`,
    );
  }
}
