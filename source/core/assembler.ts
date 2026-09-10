import type { Token } from "./token";

export type Assembler<
  T = unknown,
  Args extends readonly unknown[] = readonly unknown[],
> = new (...args: Args) => T;

export type TokensForArgs<Args extends readonly unknown[]> = {
  readonly [K in keyof Args]: Token<Args[K]>;
};
