import type { Token } from "../token";
import { describeToken, formatTokenStack } from "./helpers";

export class DockdiError extends Error {
  override readonly name: string = "DockdiError";
};

export class BindingConflictError extends DockdiError {
  override readonly name: string = "BindingConflictError";

  constructor(readonly token: Token<unknown>) {
    super(`Token already bound: ${describeToken(token)}`);
  };
};

export class CircularDependencyError extends DockdiError {
  override readonly name: string = "CircularDependencyError";

  constructor(readonly cycle: readonly Token<unknown>[]) {
    super(`Circular dependency detected: ${formatTokenStack(cycle)}`);
  };
};

export class MissingTokenError extends DockdiError {
  override readonly name: string = "MissingTokenError";

  constructor(
    readonly token: Token<unknown>,
    readonly activeStack: readonly Token<unknown>[],
    readonly suggestions: readonly string[] | undefined = undefined,
  ) {
    const pathInfo =
      activeStack.length > 0
        ? ` (requested by ${formatTokenStack(activeStack)})`
        : "";
    const suggestionsInfo =
      suggestions && suggestions.length > 0
        ? `. Did you mean: ${suggestions.map((s) => `Token[${s}]`).join(", ")}?`
        : "";
    super(`Token not registered: ${describeToken(token)}${pathInfo}${suggestionsInfo}`);
  };
};

export class AsyncBindingError extends DockdiError {
  override readonly name: string = "AsyncBindingError";

  constructor(
    readonly token: Token<unknown>,
    readonly activeStack: readonly Token<unknown>[],
  ) {
    const pathInfo =
      activeStack.length > 0
        ? ` (requested by ${formatTokenStack(activeStack)})`
        : "";
    super(`Cannot resolve async binding synchronously for ${describeToken(token)}${pathInfo}. Use container.resolveAsync() instead.`);
  };
};
