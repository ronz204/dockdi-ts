import type {
  Binding,
  BindingBuilder,
  BindingType,
  ScopedBindingBuilder,
} from "./binding";
import { tokenAlreadyBoundError } from "./errors";
import type { Token } from "./token";

export function createBindingBuilder<T>(
  token: Token<T>,
  registry: Map<Token<unknown>, Binding<unknown>>,
): BindingBuilder<T> {
  if (registry.has(token as Token<unknown>)) {
    throw tokenAlreadyBoundError(token as Token<unknown>);
  }

  const register = (
    type: BindingType,
    provider: unknown,
    dependencies?: readonly Token<unknown>[],
  ): Binding<unknown> => {
    const binding: Binding<unknown> = {
      type,
      scope: "transient",
      provider,
      dependencies,
    };
    registry.set(token as Token<unknown>, binding);
    return binding;
  };

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
    toClass: (target, tokens): ScopedBindingBuilder =>
      createScopedBuilder(
        register("class", target, tokens as readonly Token<unknown>[]),
      ),
    toValue: (value: T): void => {
      register("value", value);
    },
    toFactory: (factory, tokens): ScopedBindingBuilder =>
      createScopedBuilder(
        register("factory", factory, tokens as readonly Token<unknown>[]),
      ),
  };
}
