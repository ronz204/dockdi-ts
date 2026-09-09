import { Container, type ScopedBindingBuilder, token } from "@source/index";
import { expectTypeOf } from "expect-type";
import { describe, expect, it } from "vitest";

// Domain test models for Diamond Graph
class LeafDependency {
  static nextId = 1;
  readonly id: number;

  constructor() {
    this.id = LeafDependency.nextId++;
  }
}

class BranchB {
  constructor(readonly leaf: LeafDependency) {}
}

class BranchC {
  constructor(readonly leaf: LeafDependency) {}
}

class RootA {
  constructor(
    readonly b: BranchB,
    readonly c: BranchC,
  ) {}
}

describe("Lifecycle Scopes (Phase 2)", () => {
  // Tokens
  const leafToken = token<LeafDependency>("leaf.dependency");
  const branchBToken = token<BranchB>("branch.b");
  const branchCToken = token<BranchC>("branch.c");
  const rootToken = token<RootA>("root.a");

  describe("Singleton Scope", () => {
    it("preserves reference identity across multiple get calls on the same container", () => {
      const container = new Container();
      container.bind(leafToken).toClass(LeafDependency, []).inSingletonScope();

      const instance1 = container.get(leafToken);
      const instance2 = container.get(leafToken);

      expect(instance1).toBeInstanceOf(LeafDependency);
      expect(instance1).toBe(instance2);
      expect(instance1.id).toBe(instance2.id);
    });

    it("evaluates a singleton factory only once and caches the result", () => {
      const container = new Container();
      let evaluations = 0;
      const computedToken = token<{ timestamp: number }>("computed.token");

      container
        .bind(computedToken)
        .toFactory(() => {
          evaluations++;
          return { timestamp: Date.now() };
        }, [])
        .inSingletonScope();

      const first = container.get(computedToken);
      const second = container.get(computedToken);

      expect(evaluations).toBe(1);
      expect(first).toBe(second);
    });

    it("maintains cache isolation between independent container instances", () => {
      const container1 = new Container();
      const container2 = new Container();

      container1.bind(leafToken).toClass(LeafDependency, []).inSingletonScope();
      container2.bind(leafToken).toClass(LeafDependency, []).inSingletonScope();

      const inst1 = container1.get(leafToken);
      const inst2 = container2.get(leafToken);

      expect(inst1).toBeInstanceOf(LeafDependency);
      expect(inst2).toBeInstanceOf(LeafDependency);
      expect(inst1).not.toBe(inst2);
    });
  });

  describe("Diamond Dependency Graph Resolution", () => {
    it("instantiates distinct leaves when leaf is transient (default)", () => {
      const container = new Container();

      container.bind(leafToken).toClass(LeafDependency, []); // Transient by default
      container.bind(branchBToken).toClass(BranchB, [leafToken]);
      container.bind(branchCToken).toClass(BranchC, [leafToken]);
      container.bind(rootToken).toClass(RootA, [branchBToken, branchCToken]);

      const root = container.get(rootToken);

      expect(root.b.leaf).not.toBe(root.c.leaf);
      expect(root.b.leaf.id).not.toBe(root.c.leaf.id);
    });

    it("shares the exact same leaf instance across branches when leaf is singleton", () => {
      const container = new Container();

      container.bind(leafToken).toClass(LeafDependency, []).inSingletonScope();
      container.bind(branchBToken).toClass(BranchB, [leafToken]);
      container.bind(branchCToken).toClass(BranchC, [leafToken]);
      container.bind(rootToken).toClass(RootA, [branchBToken, branchCToken]);

      const root1 = container.get(rootToken);
      const root2 = container.get(rootToken);

      // Same instance within single resolution tree
      expect(root1.b.leaf).toBe(root1.c.leaf);

      // Same instance across multiple resolution trees
      expect(root1.b.leaf).toBe(root2.b.leaf);
    });

    it("shares instance within a single resolution tree but creates fresh instance across resolutions when leaf is resolution-scoped", () => {
      const container = new Container();

      container.bind(leafToken).toClass(LeafDependency, []).inResolutionScope();
      container.bind(branchBToken).toClass(BranchB, [leafToken]);
      container.bind(branchCToken).toClass(BranchC, [leafToken]);
      container.bind(rootToken).toClass(RootA, [branchBToken, branchCToken]);

      const root1 = container.get(rootToken);
      const root2 = container.get(rootToken);

      // Within resolution 1: both branches share the exact same leaf
      expect(root1.b.leaf).toBe(root1.c.leaf);

      // Within resolution 2: both branches share the exact same leaf
      expect(root2.b.leaf).toBe(root2.c.leaf);

      // ACROSS resolutions: root1 and root2 received distinct leaf instances
      expect(root1.b.leaf).not.toBe(root2.b.leaf);
      expect(root1.b.leaf.id).not.toBe(root2.b.leaf.id);
    });

    it("applies resolution scope identically when the shared node is a factory binding", () => {
      const container = new Container();
      let evaluations = 0;

      const factoryLeafToken = token<{ id: number }>("factory.leaf");
      const factoryBranchBToken = token<{ leaf: { id: number } }>(
        "factory.branch.b",
      );
      const factoryBranchCToken = token<{ leaf: { id: number } }>(
        "factory.branch.c",
      );
      const factoryRootToken = token<{
        b: { leaf: { id: number } };
        c: { leaf: { id: number } };
      }>("factory.root");

      container
        .bind(factoryLeafToken)
        .toFactory(() => ({ id: ++evaluations }), [])
        .inResolutionScope();
      container
        .bind(factoryBranchBToken)
        .toFactory((leaf) => ({ leaf }), [factoryLeafToken]);
      container
        .bind(factoryBranchCToken)
        .toFactory((leaf) => ({ leaf }), [factoryLeafToken]);
      container
        .bind(factoryRootToken)
        .toFactory(
          (b, c) => ({ b, c }),
          [factoryBranchBToken, factoryBranchCToken],
        );

      const root1 = container.get(factoryRootToken);
      const root2 = container.get(factoryRootToken);

      // Shared within a single resolution tree, fresh across separate get() calls —
      // proves resolver's scope caching applies to factories, not just classes.
      expect(root1.b.leaf).toBe(root1.c.leaf);
      expect(root1.b.leaf).not.toBe(root2.b.leaf);
    });
  });

  describe("container.reset() Cache Invalidation", () => {
    it("purges cached singletons and allows re-instantiation while preserving bindings", () => {
      const container = new Container();
      container.bind(leafToken).toClass(LeafDependency, []).inSingletonScope();

      const beforeReset1 = container.get(leafToken);
      const beforeReset2 = container.get(leafToken);
      expect(beforeReset1).toBe(beforeReset2);

      // Reset cache
      container.reset();

      // Subsequent get must instantiate a fresh instance and cache it
      const afterReset1 = container.get(leafToken);
      const afterReset2 = container.get(leafToken);

      expect(afterReset1).not.toBe(beforeReset1);
      expect(afterReset1).toBe(afterReset2);
    });

    it("leaves toValue bindings unaffected by reset()", () => {
      const container = new Container();
      const config = { host: "prod.db", port: 5432 };
      const configToken = token<{ host: string; port: number }>("value.config");
      container.bind(configToken).toValue(config);

      const before = container.get(configToken);
      container.reset();
      const after = container.get(configToken);

      expect(after).toBe(before);
      expect(after).toBe(config);
    });
  });

  describe("Static Type Safety", () => {
    it("exposes ScopedBindingBuilder on toClass and toFactory", () => {
      const container = new Container();
      const builder = container.bind(leafToken).toClass(LeafDependency, []);

      expectTypeOf(builder).toEqualTypeOf<ScopedBindingBuilder>();
    });
  });
});
