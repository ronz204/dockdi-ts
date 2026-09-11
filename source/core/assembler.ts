import type { Token } from "./token";

export type Constructor<
  T = unknown,
  Args extends readonly unknown[] = readonly unknown[],
> = new (...args: Args) => T;

export type Tokens<Args extends readonly unknown[]> = {
  readonly [K in keyof Args]: Token<Args[K]>;
};

export type TokensArg<Args extends readonly unknown[]> =
  Args["length"] extends 0 ? [tokens?: []] : [tokens: Tokens<Args>];
