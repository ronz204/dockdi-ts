import type { Token } from "./token";

export type Constructor<
  T = unknown, Args extends readonly unknown[] = readonly unknown[],
> = new (...args: Args) => T;

export type TokensForArgs<Args extends readonly unknown[]> = {
  readonly [K in keyof Args]: Token<Args[K]>;
};

export type TokenResolver = <T>(token: Token<T>) => T;

export function instantiate<T, Args extends readonly unknown[]>(
  target: Constructor<T, Args>,
  tokens: TokensForArgs<Args>,
  resolve: TokenResolver,
): T {
  const resolvedArgs = (tokens as readonly Token<unknown>[]).map((t) => resolve(t));
  return new target(...(resolvedArgs as unknown as Args));
}
