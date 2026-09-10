import type { Token } from "../token";
import {
  describeToken,
  formatTokenChain,
  formatResolutionPath,
} from "./helpers";

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
    super(`Circular dependency detected: ${formatTokenChain(cycle)}`);
  };
};

export class MissingTokenError extends DockdiError {
  override readonly name = "MissingTokenError";

  constructor(
    readonly token: Token<unknown>,
    readonly activeStack: readonly Token<unknown>[],
    readonly suggestions: readonly string[] | undefined = undefined,
  ) {
    const lines = [
      `Token not registered: ${describeToken(token)}`,
      formatResolutionPath(activeStack, token),
    ];

    if (suggestions?.length) {
      const formattedSuggestions = suggestions.map((s) => `Token[${s}]`).join(", ");
      lines.push(`\nDid you mean: ${formattedSuggestions}?`);
    };

    super(lines.filter(Boolean).join("\n"));
  };
};

export class AsyncBindingError extends DockdiError {
  override readonly name = "AsyncBindingError";

  constructor(
    readonly token: Token<unknown>,
    readonly activeStack: readonly Token<unknown>[],
  ) {
    const lines = [
      `Cannot resolve async binding synchronously for: ${describeToken(token)}`,
      formatResolutionPath(activeStack, token),
      `\nAction required: Use "await container.resolveAsync(...)" instead.`,
    ];

    super(lines.filter(Boolean).join("\n"));
  };
};
