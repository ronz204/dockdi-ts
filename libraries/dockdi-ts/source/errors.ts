import type { Token } from "./token";

function describeToken(token: Token<unknown>): string {
  return token.description ?? token.toString();
}

export function tokenAlreadyBoundError(token: Token<unknown>): Error {
  return new Error(`Token already bound: ${describeToken(token)}`);
}

export function tokenNotRegisteredError(token: Token<unknown>): Error {
  return new Error(`Token not registered: ${describeToken(token)}`);
}
