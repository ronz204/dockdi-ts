import type { Token } from "./token";
import type { Constructor, TokensForArgs } from "../constructor";

export type BindingType = "class" | "factory" | "value" | "async";
export type ScopeType = "transient" | "singleton" | "resolution";

export interface Binding<_T = unknown> {
  scope: ScopeType;
  readonly type: BindingType;
  readonly provider: unknown;
  readonly dependencies?: readonly Token<unknown>[];
};

export interface ScopedBindingBuilder {
  inSingletonScope(): void;
  inTransientScope(): void;
  inResolutionScope(): void;
};

export interface BindingBuilder<T> {
  toValue(value: T): void;
  toClass<Args extends readonly unknown[]>(
    target: Constructor<T, Args>,
    tokens: TokensForArgs<Args>,
  ): ScopedBindingBuilder;
  toFactory<Args extends readonly unknown[]>(
    factory: (...args: Args) => T,
    tokens: TokensForArgs<Args>,
  ): ScopedBindingBuilder;
  tpAsync<Args extends readonly unknown[]>(
    factory: (...args: Args) => Promise<T> | T,
    tokens: TokensForArgs<Args>,
  ): ScopedBindingBuilder;
};
