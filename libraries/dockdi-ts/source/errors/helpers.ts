import type { Token } from "../core/token";

export function describeToken(token: Token<unknown>): string {
  return token.description ? `Token[${token.description}]` : token.toString();
};

export function formatTokenChain(chain: readonly Token<unknown>[]): string {
  return chain.map(describeToken).join(" -> ");
};

export function formatResolutionPath(
  stack: readonly Token<unknown>[], failed: Token<unknown>,
): string {
  if (stack.length === 0) return "";

  const fullChain = [...stack, failed];
  const formatted = fullChain
    .map((tok, idx) => {
      const indent = "  ".repeat(idx);
      const prefix = idx === 0 ? "" : "└─> ";
      const suffix = idx === fullChain.length - 1 ? " (FAILED)" : "";
      return `${indent}${prefix}${describeToken(tok)}${suffix}`;
    }).join("\n");

  return `\nResolution path:\n${formatted}`;
};
