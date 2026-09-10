import type { Constructor, TokensForArgs } from "./constructor";
import type { Token } from "./token";

export type BindingType = "class" | "factory" | "value" | "asyncFactory";
export type ScopeType = "transient" | "singleton" | "resolution";

export interface Binding<_T = unknown> {
  readonly type: BindingType;
  scope: ScopeType;
  readonly provider: unknown;
  readonly dependencies?: readonly Token<unknown>[];
}

export interface ScopedBindingBuilder {
  inSingletonScope(): void;
  inTransientScope(): void;
  inResolutionScope(): void;
}

export interface BindingBuilder<T> {
  toClass<Args extends readonly unknown[]>(
    target: Constructor<T, Args>,
    tokens: TokensForArgs<Args>,
  ): ScopedBindingBuilder;
  toValue(value: T): void;
  toFactory<Args extends readonly unknown[]>(
    factory: (...args: Args) => T,
    tokens: TokensForArgs<Args>,
  ): ScopedBindingBuilder;
  toAsyncFactory<Args extends readonly unknown[]>(
    factory: (...args: Args) => Promise<T> | T,
    tokens: TokensForArgs<Args>,
  ): ScopedBindingBuilder;
}
