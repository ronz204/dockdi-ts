declare const __brand: unique symbol;

export type Token<T> = symbol & {
  readonly [__brand]: T;
};

export function token<T>(description?: string): Token<T> {
  return Symbol(description) as Token<T>;
}
