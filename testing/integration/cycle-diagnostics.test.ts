import { CircularDependencyError, Container, token } from "dockdi";
import { describe, expect, it } from "vitest";

describe("Integration: Circular Dependency Diagnostics", () => {
  it("detects direct circular dependency between two services", () => {
    const TokenA = token<unknown>("NodeA");
    const TokenB = token<unknown>("NodeB");

    const container = new Container();
    container.bind(TokenA).toFactory((b) => ({ b }), [TokenB]);
    container.bind(TokenB).toFactory((a) => ({ a }), [TokenA]);

    try {
      container.get(TokenA);
      expect.unreachable("should have thrown CircularDependencyError");
    } catch (err) {
      expect(err).toBeInstanceOf(CircularDependencyError);
      const cycleError = err as CircularDependencyError;
      expect(cycleError.cycle).toEqual([TokenA, TokenB, TokenA]);
      expect(cycleError.message).toContain(
        "Token[NodeA] -> Token[NodeB] -> Token[NodeA]",
      );
    }
  });

  it("detects deep nested cycle within larger graph", () => {
    const RootToken = token<unknown>("Root");
    const TokenA = token<unknown>("NodeA");
    const TokenB = token<unknown>("NodeB");
    const TokenC = token<unknown>("NodeC");

    const container = new Container();
    container.bind(RootToken).toFactory((a) => ({ a }), [TokenA]);
    container.bind(TokenA).toFactory((b) => ({ b }), [TokenB]);
    container.bind(TokenB).toFactory((c) => ({ c }), [TokenC]);
    container.bind(TokenC).toFactory((a) => ({ a }), [TokenA]);

    try {
      container.get(RootToken);
      expect.unreachable("should have thrown CircularDependencyError");
    } catch (err) {
      expect(err).toBeInstanceOf(CircularDependencyError);
      const cycleError = err as CircularDependencyError;
      expect(cycleError.cycle).toEqual([TokenA, TokenB, TokenC, TokenA]);
      expect(cycleError.message).toContain(
        "Token[NodeA] -> Token[NodeB] -> Token[NodeC] -> Token[NodeA]",
      );
    }
  });
});
