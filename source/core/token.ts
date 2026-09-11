declare const __brand: unique symbol;

export type Token<T> = symbol & {
  readonly [__brand]: T;
};

export type Class<T> = abstract new (...args: never[]) => T;

export function token<T>(target?: Class<T> | string): Token<T> {
  const desc = typeof target === "function" ? target.name : target;
  return Symbol(desc) as Token<T>;
}
