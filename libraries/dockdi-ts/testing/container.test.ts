import { Container, token } from "@source/index";
import { expectTypeOf } from "expect-type";
import { describe, expect, it } from "vitest";

// Domain test models
interface DatabaseConfig {
  readonly host: string;
  readonly port: number;
}

class DatabaseConnection {
  constructor(readonly config: DatabaseConfig) {}
}

class UserRepository {
  constructor(readonly db: DatabaseConnection) {}
}

class UserService {
  constructor(
    readonly repo: UserRepository,
    readonly prefix: string,
  ) {}

  formatName(name: string): string {
    return `${this.prefix}: ${name}`;
  }
}

class TransientCounter {
  static nextId = 1;
  readonly id: number;

  constructor() {
    this.id = TransientCounter.nextId++;
  }
}

describe("Container & Registry (Phase 1)", () => {
  // Tokens
  const configToken = token<DatabaseConfig>("database.config");
  const connectionToken = token<DatabaseConnection>("database.connection");
  const repoToken = token<UserRepository>("user.repository");
  const serviceToken = token<UserService>("user.service");
  const prefixToken = token<string>("service.prefix");
  const counterToken = token<TransientCounter>("transient.counter");
  const factoriedToken = token<string>("factoried.value");

  describe("Linear Dependency Graph Resolution", () => {
    it("resolves a linear chain of dependencies (Value -> Class -> Class -> Class)", () => {
      const container = new Container();

      const config: DatabaseConfig = { host: "localhost", port: 5432 };

      container.bind(configToken).toValue(config);
      container.bind(prefixToken).toValue("USR");
      container
        .bind(connectionToken)
        .toClass(DatabaseConnection, [configToken]);
      container.bind(repoToken).toClass(UserRepository, [connectionToken]);
      container
        .bind(serviceToken)
        .toClass(UserService, [repoToken, prefixToken]);

      const service = container.get(serviceToken);

      expect(service).toBeInstanceOf(UserService);
      expect(service.repo).toBeInstanceOf(UserRepository);
      expect(service.repo.db).toBeInstanceOf(DatabaseConnection);
      expect(service.repo.db.config).toBe(config);
      expect(service.formatName("Alice")).toBe("USR: Alice");
    });

    it("resolves dependencies with synchronous factory bindings", () => {
      const container = new Container();

      container.bind(prefixToken).toValue("FACTORY");
      container
        .bind(factoriedToken)
        .toFactory((p) => `${p}_RESULT`, [prefixToken]);

      const result = container.get(factoriedToken);
      expect(result).toBe("FACTORY_RESULT");
    });
  });

  describe("Transient Scope Isolation", () => {
    it("returns distinct instances on successive get calls for class bindings", () => {
      const container = new Container();
      container.bind(counterToken).toClass(TransientCounter, []);

      const first = container.get(counterToken);
      const second = container.get(counterToken);

      expect(first).toBeInstanceOf(TransientCounter);
      expect(second).toBeInstanceOf(TransientCounter);
      expect(first).not.toBe(second);
      expect(first.id).not.toBe(second.id);
    });

    it("returns distinct evaluations on successive get calls for factory bindings", () => {
      const container = new Container();
      const objToken = token<{ id: number }>("obj");
      let counter = 0;

      container.bind(objToken).toFactory(() => ({ id: ++counter }), []);

      const first = container.get(objToken);
      const second = container.get(objToken);

      expect(first).not.toBe(second);
      expect(first.id).toBe(1);
      expect(second.id).toBe(2);
    });

    it("preserves reference for constant value bindings", () => {
      const container = new Container();
      const config: DatabaseConfig = { host: "prod.db", port: 5432 };
      container.bind(configToken).toValue(config);

      const first = container.get(configToken);
      const second = container.get(configToken);

      expect(first).toBe(second);
      expect(first).toBe(config);
    });
  });

  describe("Error Conditions", () => {
    it("throws an error when attempting to bind an already registered token", () => {
      const container = new Container();
      container.bind(prefixToken).toValue("A");

      expect(() => {
        container.bind(prefixToken).toValue("B");
      }).toThrowError(/already bound.*service\.prefix/);
    });

    it("throws an error when resolving an unregistered token", () => {
      const container = new Container();
      const unregistered = token<string>("unregistered.token");

      expect(() => {
        container.get(unregistered);
      }).toThrowError(/not registered.*unregistered\.token/);
    });

    it("throws an error when a transitive dependency is missing from the container", () => {
      const container = new Container();
      // DatabaseConnection depends on configToken, which is NOT registered
      container
        .bind(connectionToken)
        .toClass(DatabaseConnection, [configToken]);

      expect(() => {
        container.get(connectionToken);
      }).toThrowError(/not registered.*database\.config/);
    });
  });

  describe("Static Type Safety", () => {
    it("infers exact return type from container.get(token)", () => {
      const container = new Container();
      container.bind(prefixToken).toValue("PRE");

      const resolved = container.get(prefixToken);
      expectTypeOf(resolved).toEqualTypeOf<string>();
    });

    it("rejects invalid value types in toValue", () => {
      const container = new Container();
      // @ts-expect-error Cannot assign number to Token<string>
      container.bind(prefixToken).toValue(12345);
    });

    it("rejects mismatched token dependencies in toClass", () => {
      const container = new Container();
      const builder = container.bind(connectionToken);
      // @ts-expect-error DatabaseConnection expects DatabaseConfig, got Token<string>
      builder.toClass(DatabaseConnection, [prefixToken]);
    });

    it("rejects mismatched token dependencies in toFactory", () => {
      const container = new Container();
      const fn = (cfg: DatabaseConfig): string => cfg.host;
      // @ts-expect-error fn expects DatabaseConfig, got Token<string>
      container.bind(factoriedToken).toFactory(fn, [prefixToken]);
    });
  });
});
