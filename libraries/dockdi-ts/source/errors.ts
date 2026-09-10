import type { Binding } from "./binding";
import type { Token } from "./token";

function describeToken(token: Token<unknown>): string {
  return token.description ? `Token[${token.description}]` : token.toString();
}

function formatTokenStack(stack: readonly Token<unknown>[]): string {
  return stack.map(describeToken).join(" -> ");
}

export class DockdiError extends Error {
  override readonly name: string = "DockdiError";
}

export class BindingConflictError extends DockdiError {
  override readonly name: string = "BindingConflictError";

  constructor(readonly token: Token<unknown>) {
    super(`Token already bound: ${describeToken(token)}`);
  }
}

export class CircularDependencyError extends DockdiError {
  override readonly name: string = "CircularDependencyError";

  constructor(readonly cycle: readonly Token<unknown>[]) {
    super(`Circular dependency detected: ${formatTokenStack(cycle)}`);
  }
}

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
    super(
      `Token not registered: ${describeToken(token)}${pathInfo}${suggestionsInfo}`,
    );
  }
}

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const row: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    let prevDiag = row[0] ?? 0;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j] ?? 0;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const rowJ = row[j] ?? 0;
      const rowJPrev = row[j - 1] ?? 0;
      row[j] = Math.min(rowJ + 1, rowJPrev + 1, prevDiag + cost);
      prevDiag = temp;
    }
  }

  return row[b.length] ?? 0;
}

export function findTokenSuggestions(
  missingToken: Token<unknown>,
  registry: Map<Token<unknown>, Binding<unknown>>,
): readonly string[] | undefined {
  const missingDesc = missingToken.description;
  if (!missingDesc) return undefined;

  const suggestions: { desc: string; dist: number }[] = [];

  for (const registeredToken of registry.keys()) {
    const desc = registeredToken.description;
    if (!desc || desc === missingDesc) continue;

    const dist = levenshteinDistance(
      missingDesc.toLowerCase(),
      desc.toLowerCase(),
    );

    const threshold = Math.max(3, Math.floor(missingDesc.length / 2));
    if (dist <= threshold) {
      suggestions.push({ desc, dist });
    }
  }

  if (suggestions.length === 0) return undefined;

  suggestions.sort((a, b) => a.dist - b.dist);
  return suggestions.map((s) => s.desc);
}
