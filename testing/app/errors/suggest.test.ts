import type { Binding } from "@core/binding";
import { findTokenSuggestions } from "@errors/suggest";
import { type Token, token } from "dockdi";
import { describe, expect, it } from "vitest";

describe("Token Suggestion Engine", () => {
  it("suggests close matches for misspelled token descriptions", () => {
    const registry = new Map<Token<unknown>, Binding<unknown>>();
    const userRepoToken = token<unknown>("UserRepository");
    const authServiceToken = token<unknown>("AuthService");

    registry.set(userRepoToken, {
      type: "value",
      scope: "transient",
      provider: {},
    });
    registry.set(authServiceToken, {
      type: "value",
      scope: "transient",
      provider: {},
    });

    const queryToken = token<unknown>("UserRepositry");
    const suggestions = findTokenSuggestions(queryToken, registry);

    expect(suggestions).toBeDefined();
    expect(suggestions).toContain("UserRepository");
    expect(suggestions).not.toContain("AuthService");
  });

  it("returns undefined when token has no description", () => {
    const registry = new Map<Token<unknown>, Binding<unknown>>();
    const unnamed = token<unknown>();

    const suggestions = findTokenSuggestions(unnamed, registry);
    expect(suggestions).toBeUndefined();
  });

  it("returns undefined when distance exceeds threshold", () => {
    const registry = new Map<Token<unknown>, Binding<unknown>>();
    const cat = token<unknown>("Cat");
    registry.set(cat, { type: "value", scope: "transient", provider: {} });

    const queryToken = token<unknown>("CompletelyUnrelatedService");
    const suggestions = findTokenSuggestions(queryToken, registry);
    expect(suggestions).toBeUndefined();
  });
});
