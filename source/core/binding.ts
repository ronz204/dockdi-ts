import type { Constructor, TokensArg } from "./assembler";
import type { Token } from "./token";

export type BindingType = "class" | "factory" | "value";
export type ScopeType = "transient" | "singleton" | "resolution";

export interface Binding<_T = unknown> {
  scope: ScopeType;
  readonly type: BindingType;
  readonly provider: unknown;
  readonly deps?: readonly Token<unknown>[];
}

export interface ScopeBuilder {
  inSingleton(): void;
  inTransient(): void;
  inResolution(): void;
}

export interface BindingBuilder<T> {
  toValue(value: T): void;
  toClass<Args extends readonly unknown[]>(
    target: Constructor<T, Args>,
    ...[tokens]: TokensArg<Args>
  ): ScopeBuilder;
  toFactory<Args extends readonly unknown[]>(
    factory: (...args: Args) => T,
    ...[tokens]: TokensArg<Args>
  ): ScopeBuilder;
}
