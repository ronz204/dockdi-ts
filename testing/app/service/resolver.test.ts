import type { Binding } from "@core/binding";
import { SingletonCache } from "@service/caching";
import { Resolver } from "@service/resolver";
import {
  CircularDependencyError,
  InstantiationError,
  MissingTokenError,
  type Token,
  token,
} from "dockdi";
import { describe, expect, it } from "vitest";

describe("Resolver Engine", () => {
  it("resolves constant value binding", () => {
    const registry = new Map<Token<unknown>, Binding<unknown>>();
    const storage = new SingletonCache();
    const resolver = new Resolver(registry, storage);

    const t = token<string>("val");
    registry.set(t, { type: "value", scope: "transient", provider: "dockdi" });

    const result = resolver.resolve(t);
    expect(result).toBe("dockdi");
  });

  it("throws MissingTokenError when token is not registered", () => {
    const registry = new Map<Token<unknown>, Binding<unknown>>();
    const storage = new SingletonCache();
    const resolver = new Resolver(registry, storage);

    const t = token<string>("missing");
    expect(() => resolver.resolve(t)).toThrow(MissingTokenError);
  });

  it("detects circular dependency and throws CircularDependencyError", () => {
    const registry = new Map<Token<unknown>, Binding<unknown>>();
    const storage = new SingletonCache();
    const resolver = new Resolver(registry, storage);

    const tokenA = token<unknown>("A");
    const tokenB = token<unknown>("B");

    registry.set(tokenA, {
      type: "factory",
      scope: "transient",
      provider: (b: unknown) => ({ b }),
      deps: [tokenB],
    });

    registry.set(tokenB, {
      type: "factory",
      scope: "transient",
      provider: (a: unknown) => ({ a }),
      deps: [tokenA],
    });

    expect(() => resolver.resolve(tokenA)).toThrow(CircularDependencyError);
  });

  it("resolves sibling dependencies synchronously", () => {
    const registry = new Map<Token<unknown>, Binding<unknown>>();
    const storage = new SingletonCache();
    const resolver = new Resolver(registry, storage);

    const dep1 = token<number>("dep1");
    const dep2 = token<number>("dep2");
    const root = token<number>("root");

    registry.set(dep1, {
      type: "factory",
      scope: "transient",
      provider: () => 10,
    });

    registry.set(dep2, {
      type: "factory",
      scope: "transient",
      provider: () => 20,
    });

    registry.set(root, {
      type: "factory",
      scope: "transient",
      provider: (a: unknown, b: unknown) => (a as number) + (b as number),
      deps: [dep1, dep2],
    });

    const sum = resolver.resolve(root);
    expect(sum).toBe(30);
  });

  it("wraps provider instantiation failures in InstantiationError", () => {
    const registry = new Map<Token<unknown>, Binding<unknown>>();
    const storage = new SingletonCache();
    const resolver = new Resolver(registry, storage);

    const failToken = token<unknown>("Failing");
    registry.set(failToken, {
      type: "factory",
      scope: "transient",
      provider: () => {
        throw new Error("Initialization crashed");
      },
    });

    expect(() => resolver.resolve(failToken)).toThrow(InstantiationError);
  });
});
