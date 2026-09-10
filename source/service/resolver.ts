import type { Assembler } from "@core/assembler";
import type { Binding } from "@core/binding";
import type { Token } from "@core/token";
import { CircularDependencyError, MissingTokenError } from "@errors/catalog";
import { findTokenSuggestions } from "@errors/suggest";

export async function resolveToken<T>(
  token: Token<T>,
  registry: Map<Token<unknown>, Binding<unknown>>,
  activeStack: readonly Token<unknown>[] = [],
): Promise<T> {
  const tokenKey = token as Token<unknown>;

  const existingIndex = activeStack.indexOf(tokenKey);
  if (existingIndex !== -1) {
    const cycle = [...activeStack.slice(existingIndex), tokenKey];
    throw new CircularDependencyError(cycle);
  }

  const binding = registry.get(tokenKey);
  if (!binding) {
    const suggestions = findTokenSuggestions(tokenKey, registry);
    throw new MissingTokenError(tokenKey, activeStack, suggestions);
  }

  if (binding.type === "value") {
    return binding.provider as T;
  }

  const nextStack = [...activeStack, tokenKey];
  const dependencies = binding.dependencies ?? [];
  const resolvedArgs = await Promise.all(
    dependencies.map((dep) => resolveToken(dep, registry, nextStack)),
  );

  if (binding.type === "class") {
    const Target = binding.provider as Assembler<T, unknown[]>;
    return new Target(...resolvedArgs);
  }

  const factory = binding.provider as (...args: unknown[]) => T | Promise<T>;
  return await factory(...resolvedArgs);
}
