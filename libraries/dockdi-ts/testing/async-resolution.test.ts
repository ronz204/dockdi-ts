import {
  AsyncBindingError,
  CircularDependencyError,
  Container,
  DockdiError,
  token,
} from "@source/index";
import { describe, expect, expectTypeOf, it } from "vitest";

interface DatabaseConnection {
  readonly connectionString: string;
  readonly isConnected: boolean;
}

interface UserConfig {
  readonly theme: string;
}

class UserRepository {
  constructor(
    readonly db: DatabaseConnection,
    readonly config: UserConfig,
  ) {}
}

describe("Asynchronous Resolution (Phase 4)", () => {
  describe("Async Factory Binding & Resolution", () => {
    it("resolves an async factory producing a promise", async () => {
      const container = new Container();
      const dbToken = token<DatabaseConnection>("db.connection");

      container.bind(dbToken).toAsyncFactory(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return {
          connectionString: "postgres://localhost:5432",
          isConnected: true,
        };
      }, []);

      const db = await container.resolveAsync(dbToken);

      expect(db.connectionString).toBe("postgres://localhost:5432");
      expect(db.isConnected).toBe(true);
    });

    it("resolves synchronous factory or value bindings seamlessly inside resolveAsync", async () => {
      const container = new Container();
      const configToken = token<UserConfig>("user.config");

      container.bind(configToken).toValue({ theme: "dark" });

      const config = await container.resolveAsync(configToken);
      expect(config).toEqual({ theme: "dark" });
    });

    it("resolves a mixed dependency graph (Sync Class -> Async Factory + Sync Value)", async () => {
      const container = new Container();
      const dbToken = token<DatabaseConnection>("db.connection");
      const configToken = token<UserConfig>("user.config");
      const repoToken = token<UserRepository>("user.repository");

      container.bind(configToken).toValue({ theme: "dark" });

      container.bind(dbToken).toAsyncFactory(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return {
          connectionString: "postgres://localhost:5432",
          isConnected: true,
        };
      }, []);

      container.bind(repoToken).toClass(UserRepository, [dbToken, configToken]);

      const repo = await container.resolveAsync(repoToken);

      expect(repo).toBeInstanceOf(UserRepository);
      expect(repo.db.isConnected).toBe(true);
      expect(repo.config.theme).toBe("dark");
    });
  });

  describe("Synchronous Call Guard (AsyncBindingError)", () => {
    it("throws AsyncBindingError when container.get() is called directly on an async factory", () => {
      const container = new Container();
      const dbToken = token<DatabaseConnection>("db.connection");

      container.bind(dbToken).toAsyncFactory(
        async () => ({
          connectionString: "postgres://localhost:5432",
          isConnected: true,
        }),
        [],
      );

      expect(() => container.get(dbToken)).toThrow(AsyncBindingError);

      try {
        container.get(dbToken);
      } catch (err) {
        expect(err).toBeInstanceOf(AsyncBindingError);
        expect(err).toBeInstanceOf(DockdiError);
        const asyncErr = err as AsyncBindingError;
        expect(asyncErr.token).toBe(dbToken);
        expect(asyncErr.message).toContain(
          "Cannot resolve async binding synchronously for Token[db.connection]",
        );
        expect(asyncErr.message).toContain(
          "Use container.resolveAsync() instead.",
        );
      }
    });

    it("throws AsyncBindingError when container.get() encounters a transitive async dependency", () => {
      const container = new Container();
      const dbToken = token<DatabaseConnection>("db.connection");
      const configToken = token<UserConfig>("user.config");
      const repoToken = token<UserRepository>("user.repository");

      container.bind(configToken).toValue({ theme: "light" });
      container.bind(dbToken).toAsyncFactory(
        async () => ({
          connectionString: "sqlite://memory",
          isConnected: true,
        }),
        [],
      );

      container.bind(repoToken).toClass(UserRepository, [dbToken, configToken]);

      try {
        container.get(repoToken);
        expect.unreachable("Should have thrown AsyncBindingError");
      } catch (err) {
        expect(err).toBeInstanceOf(AsyncBindingError);
        const asyncErr = err as AsyncBindingError;
        expect(asyncErr.token).toBe(dbToken);
        expect(asyncErr.activeStack).toEqual([repoToken]);
        expect(asyncErr.message).toContain(
          "(requested by Token[user.repository])",
        );
      }
    });
  });

  describe("Concurrent Singleton Deduplication", () => {
    it("deduplicates in-flight promises for concurrent resolveAsync calls on singletons", async () => {
      const container = new Container();
      const dbToken = token<DatabaseConnection>("db.connection");

      let factoryCallCount = 0;

      container
        .bind(dbToken)
        .toAsyncFactory(async () => {
          factoryCallCount++;
          await new Promise((resolve) => setTimeout(resolve, 20));
          return { connectionString: "sqlite://shared", isConnected: true };
        }, [])
        .inSingletonScope();

      const promise1 = container.resolveAsync(dbToken);
      const promise2 = container.resolveAsync(dbToken);

      expect(promise1).toBe(promise2);

      const [db1, db2] = await Promise.all([promise1, promise2]);

      expect(db1).toBe(db2);
      expect(factoryCallCount).toBe(1);

      const db3 = await container.resolveAsync(dbToken);
      expect(db3).toBe(db1);
      expect(factoryCallCount).toBe(1);
    });

    it("creates fresh instances per resolveAsync invocation for transient scope", async () => {
      const container = new Container();
      const dbToken = token<DatabaseConnection>("db.connection");

      container
        .bind(dbToken)
        .toAsyncFactory(
          async () => ({
            connectionString: "sqlite://fresh",
            isConnected: true,
          }),
          [],
        )
        .inTransientScope();

      const db1 = await container.resolveAsync(dbToken);
      const db2 = await container.resolveAsync(dbToken);

      expect(db1).not.toBe(db2);
    });
  });

  describe("Async Cycle Detection", () => {
    it("detects circular dependency in async pipelines (A -> B -> A)", async () => {
      interface ServiceA {
        readonly name: string;
      }
      interface ServiceB {
        readonly name: string;
      }

      const tokenA = token<ServiceA>("service.a");
      const tokenB = token<ServiceB>("service.b");

      const container = new Container();

      container.bind(tokenA).toAsyncFactory(
        async (b) => {
          return { name: `A depends on ${(b as ServiceB).name}` };
        },
        [tokenB],
      );

      container.bind(tokenB).toAsyncFactory(
        async (a) => {
          return { name: `B depends on ${(a as ServiceA).name}` };
        },
        [tokenA],
      );

      await expect(container.resolveAsync(tokenA)).rejects.toThrow(
        CircularDependencyError,
      );

      try {
        await container.resolveAsync(tokenA);
      } catch (err) {
        expect(err).toBeInstanceOf(CircularDependencyError);
        const cycleErr = err as CircularDependencyError;
        expect(cycleErr.cycle).toEqual([tokenA, tokenB, tokenA]);
        expect(cycleErr.message).toContain(
          "Circular dependency detected: Token[service.a] -> Token[service.b] -> Token[service.a]",
        );
      }
    });
  });

  describe("Cache Invalidation (container.reset())", () => {
    it("purges cached async singletons allowing re-evaluation", async () => {
      const container = new Container();
      const dbToken = token<DatabaseConnection>("db.connection");

      let count = 0;
      container
        .bind(dbToken)
        .toAsyncFactory(async () => {
          count++;
          return { connectionString: `conn://${count}`, isConnected: true };
        }, [])
        .inSingletonScope();

      const db1 = await container.resolveAsync(dbToken);
      expect(db1.connectionString).toBe("conn://1");

      container.reset();

      const db2 = await container.resolveAsync(dbToken);
      expect(db2.connectionString).toBe("conn://2");
      expect(db1).not.toBe(db2);
    });
  });

  describe("Static Type Safety", () => {
    it("infers exact Promise<T> return type from resolveAsync", () => {
      const container = new Container();
      const dbToken = token<DatabaseConnection>("db.connection");

      container.bind(dbToken).toAsyncFactory(
        async () => ({
          connectionString: "sqlite://test",
          isConnected: true,
        }),
        [],
      );

      const res = container.resolveAsync(dbToken);
      expectTypeOf(res).toEqualTypeOf<Promise<DatabaseConnection>>();
    });
  });
});
