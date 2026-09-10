import type { Token } from "../token";

export function describeToken(token: Token<unknown>): string {
  return token.description ? `Token[${token.description}]` : token.toString();
};

export function formatTokenStack(stack: readonly Token<unknown>[]): string {
  return stack.map(describeToken).join(" -> ");
};
