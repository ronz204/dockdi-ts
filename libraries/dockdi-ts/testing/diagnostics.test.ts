import {
  BindingConflictError,
  CircularDependencyError,
  Container,
  DockdiError,
  levenshteinDistance,
  MissingTokenError,
  token,
} from "@source/index";
import { describe, expect, it } from "vitest";

// Circular dependency test models
class CycleNodeA {
  constructor(readonly b: unknown) {}
}

class CycleNodeB {
  constructor(readonly c: unknown) {}
}

class CycleNodeC {
  constructor(readonly d: unknown) {}
}

class CycleNodeD {
  constructor(readonly b: unknown) {}
}

describe("Error Diagnostics & Cycle Detection (Phase 3)", () => {
  // Tokens
  const tokenA = token<CycleNodeA>("node.a");
  const tokenB = token<CycleNodeB>("node.b");
  const tokenC = token<CycleNodeC>("node.c");
  const tokenD = token<CycleNodeD>("node.d");

  describe("Circular Dependency Detection", () => {
    it("detects direct circular dependency (A -> B -> A) and aborts before stack overflow", () => {
      const container = new Container();
      container.bind(tokenA).toClass(CycleNodeA, [tokenB]);
      container.bind(tokenB).toClass(CycleNodeB, [tokenA]);

      try {
        container.get(tokenA);
        expect.unreachable("Should have thrown CircularDependencyError");
      } catch (err) {
        expect(err).toBeInstanceOf(CircularDependencyError);
        expect(err).toBeInstanceOf(DockdiError);
        expect(err).toBeInstanceOf(Error);

        const circularErr = err as CircularDependencyError;
        expect(circularErr.cycle).toEqual([tokenA, tokenB, tokenA]);
        expect(circularErr.message).toBe(
          "Circular dependency detected: Token[node.a] -> Token[node.b] -> Token[node.a]",
        );
      }
    });

    it("detects indirect circular dependency (A -> B -> C -> D -> B) and isolates the exact cycle segment", () => {
      const container = new Container();
      container.bind(tokenA).toClass(CycleNodeA, [tokenB]);
      container.bind(tokenB).toClass(CycleNodeB, [tokenC]);
      container.bind(tokenC).toClass(CycleNodeC, [tokenD]);
      container.bind(tokenD).toClass(CycleNodeD, [tokenB]); // Cycle back to B

      try {
        container.get(tokenA);
        expect.unreachable("Should have thrown CircularDependencyError");
      } catch (err) {
        expect(err).toBeInstanceOf(CircularDependencyError);
        const circularErr = err as CircularDependencyError;

        // Cycle segment should start at B and end at B
        expect(circularErr.cycle).toEqual([tokenB, tokenC, tokenD, tokenB]);
        expect(circularErr.message).toBe(
          "Circular dependency detected: Token[node.b] -> Token[node.c] -> Token[node.d] -> Token[node.b]",
        );
      }
    });

    it("detects self-referencing circular dependency (A -> A)", () => {
      const container = new Container();
      container.bind(tokenA).toClass(CycleNodeA, [tokenA]);

      try {
        container.get(tokenA);
        expect.unreachable("Should have thrown CircularDependencyError");
      } catch (err) {
        expect(err).toBeInstanceOf(CircularDependencyError);
        const circularErr = err as CircularDependencyError;
        expect(circularErr.cycle).toEqual([tokenA, tokenA]);
      }
    });
  });

  describe("Missing Token Diagnostics & Suggestions", () => {
    it("throws MissingTokenError containing resolution path when dependency is missing", () => {
      const container = new Container();
      const missingToken = token<string>("database.url");
      container.bind(tokenA).toClass(CycleNodeA, [missingToken]);

      try {
        container.get(tokenA);
        expect.unreachable("Should have thrown MissingTokenError");
      } catch (err) {
        expect(err).toBeInstanceOf(MissingTokenError);
        expect(err).toBeInstanceOf(DockdiError);

        const missingErr = err as MissingTokenError;
        expect(missingErr.token).toBe(missingToken);
        expect(missingErr.activeStack).toEqual([tokenA]);
        expect(missingErr.message).toContain(
          "Token not registered: Token[database.url]",
        );
        expect(missingErr.message).toContain("(requested by Token[node.a])");
      }
    });

    it("provides Levenshtein near-miss suggestions for typos in token descriptions", () => {
      const container = new Container();
      const registeredToken = token<string>("user.service");
      const typoToken = token<string>("user.servis"); // typo

      container.bind(registeredToken).toValue("active_service");

      try {
        container.get(typoToken);
        expect.unreachable("Should have thrown MissingTokenError");
      } catch (err) {
        expect(err).toBeInstanceOf(MissingTokenError);
        const missingErr = err as MissingTokenError;

        expect(missingErr.suggestions).toEqual(["user.service"]);
        expect(missingErr.message).toContain(
          "Did you mean: Token[user.service]?",
        );
      }
    });

    it("correctly calculates Levenshtein edit distance", () => {
      expect(levenshteinDistance("kitten", "sitting")).toBe(3);
      expect(levenshteinDistance("dockdi", "dockdi")).toBe(0);
      expect(levenshteinDistance("service", "servis")).toBe(2);
    });
  });

  describe("Binding Conflict Diagnostics", () => {
    it("throws BindingConflictError when attempting duplicate registration", () => {
      const container = new Container();
      container.bind(tokenA).toValue(new CycleNodeA(null));

      try {
        container.bind(tokenA).toValue(new CycleNodeA(null));
        expect.unreachable("Should have thrown BindingConflictError");
      } catch (err) {
        expect(err).toBeInstanceOf(BindingConflictError);
        expect(err).toBeInstanceOf(DockdiError);

        const conflictErr = err as BindingConflictError;
        expect(conflictErr.token).toBe(tokenA);
        expect(conflictErr.message).toBe("Token already bound: Token[node.a]");
      }
    });
  });
});
