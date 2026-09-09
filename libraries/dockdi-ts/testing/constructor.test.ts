import {
  type Constructor,
  instantiate,
  type Token,
  type TokenResolver,
  type TokensForArgs,
  token,
} from "@source/index";
import { expectTypeOf } from "expect-type";
import { describe, expect, it } from "vitest";

// Domain test models
interface User {
  id: string;
  name: string;
}

interface AdminUser extends User {
  role: string;
}

class Logger {
  constructor(readonly prefix: string) {}
  log(msg: string): string {
    return `[${this.prefix}] ${msg}`;
  }
}

class Database {
  constructor(readonly url: string) {}
}

class HealthChecker {
  readonly status = "healthy";
}

class SingleDepService {
  constructor(readonly logger: Logger) {}
}

class OrderService {
  constructor(
    readonly logger: Logger,
    readonly db: Database,
    readonly retries: number,
  ) {}
}

class SubtypeConsumer {
  constructor(readonly user: User) {}
}

describe("Constructor Mapping & Instantiation", () => {
  // Tokens
  const loggerToken = token<Logger>("logger");
  const dbToken = token<Database>("db");
  const retriesToken = token<number>("retries");
  const userToken = token<User>("user");
  const adminToken = token<AdminUser>("admin");
  const stringToken = token<string>("string");

  // Mock resolver registry
  const loggerInstance = new Logger("APP");
  const dbInstance = new Database("postgres://localhost:5432");
  const retriesValue = 3;
  const adminInstance: AdminUser = {
    id: "1",
    name: "Admin",
    role: "superadmin",
  };

  const resolver: TokenResolver = <T>(requested: Token<T>): T => {
    if (requested === (loggerToken as Token<unknown>))
      return loggerInstance as T;
    if (requested === (dbToken as Token<unknown>)) return dbInstance as T;
    if (requested === (retriesToken as Token<unknown>))
      return retriesValue as T;
    if (requested === (adminToken as Token<unknown>)) return adminInstance as T;
    if (requested === (userToken as Token<unknown>)) return adminInstance as T;
    if (requested === (stringToken as Token<unknown>))
      return "dummy string" as T;
    throw new Error(
      `Unregistered token in test resolver: ${requested.toString()}`,
    );
  };

  describe("Runtime Instantiation", () => {
    it("instantiates a class with zero dependencies", () => {
      const instance = instantiate(HealthChecker, [], resolver);

      expect(instance).toBeInstanceOf(HealthChecker);
      expect(instance.status).toBe("healthy");
    });

    it("instantiates a class with a single dependency", () => {
      const instance = instantiate(SingleDepService, [loggerToken], resolver);

      expect(instance).toBeInstanceOf(SingleDepService);
      expect(instance.logger).toBe(loggerInstance);
      expect(instance.logger.log("test")).toBe("[APP] test");
    });

    it("instantiates a class with multiple dependencies preserving argument order", () => {
      const instance = instantiate(
        OrderService,
        [loggerToken, dbToken, retriesToken],
        resolver,
      );

      expect(instance).toBeInstanceOf(OrderService);
      expect(instance.logger).toBe(loggerInstance);
      expect(instance.db).toBe(dbInstance);
      expect(instance.retries).toBe(3);
    });

    it("instantiates a class requiring a base type using a subtype token", () => {
      const instance = instantiate(SubtypeConsumer, [adminToken], resolver);

      expect(instance).toBeInstanceOf(SubtypeConsumer);
      expect(instance.user).toBe(adminInstance);
    });
  });

  describe("Brandi Gap Compile-Time Verification", () => {
    it("captures constructor type signature properly", () => {
      expectTypeOf<
        Constructor<OrderService, [Logger, Database, number]>
      >().toEqualTypeOf<
        new (
          logger: Logger,
          db: Database,
          retries: number,
        ) => OrderService
      >();
    });

    it("verifies TokensForArgs matches expected mapped token tuple", () => {
      type ExpectedArgs = [Logger, Database, number];
      type ExpectedTokens = TokensForArgs<ExpectedArgs>;

      expectTypeOf<ExpectedTokens>().toEqualTypeOf<
        readonly [Token<Logger>, Token<Database>, Token<number>]
      >();
    });

    it("accepts an exact match between tokens and constructor arguments", () => {
      // Valid call should compile without diagnostic errors
      const instance = instantiate(
        OrderService,
        [loggerToken, dbToken, retriesToken],
        resolver,
      );
      expectTypeOf(instance).toEqualTypeOf<OrderService>();
    });

    it("rejects tokens provided in swapped / incorrect order", () => {
      // @ts-expect-error Logger and Database tokens swapped
      instantiate(OrderService, [dbToken, loggerToken, retriesToken], resolver);
    });

    it("rejects token tuples with missing arguments", () => {
      // @ts-expect-error Missing retriesToken (expects 3 tokens, got 2)
      instantiate(OrderService, [loggerToken, dbToken], resolver);
    });

    it("rejects token tuples with excess arguments", () => {
      instantiate(
        OrderService,
        // @ts-expect-error Excess token passed to constructor expecting 3 tokens
        [loggerToken, dbToken, retriesToken, stringToken],
        resolver,
      );
    });

    it("rejects token with incompatible type in a given position", () => {
      // @ts-expect-error Third argument must be Token<number>, got Token<string>
      instantiate(OrderService, [loggerToken, dbToken, stringToken], resolver);
    });

    it("allows subtype tokens where base type is expected", () => {
      // Token<AdminUser> is assignable to Token<User> via covariance
      const instance = instantiate(SubtypeConsumer, [adminToken], resolver);
      expectTypeOf(instance).toEqualTypeOf<SubtypeConsumer>();
    });
  });
});
