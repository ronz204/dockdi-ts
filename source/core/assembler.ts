import type { Token } from "./token";

export type Assembler<
  T = unknown,
  Args extends readonly unknown[] = readonly unknown[],
> = new (...args: Args) => T;

export type TokenResolver = <T>(token: Token<T>) => T;
export type TokensForArgs<Args extends readonly unknown[]> = {
  readonly [K in keyof Args]: Token<Args[K]>;
};

export function instantiate<T, Args extends readonly unknown[]>(
  target: Assembler<T, Args>,
  tokens: TokensForArgs<Args>,
  resolve: TokenResolver,
): T {
  const resolved = (tokens as readonly Token<unknown>[]).map((t) => resolve(t));
  return new target(...(resolved as unknown as Args));
}
