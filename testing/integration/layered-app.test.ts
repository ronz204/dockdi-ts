import {
  AppConfig,
  ConsoleLogger,
  SessionAuth,
  SqlDatabase,
} from "@helpers/fixtures";
import {
  AuthToken,
  ConfigToken,
  DatabaseToken,
  LoggerToken,
} from "@helpers/tokens";
import { Container } from "dockdi";
import { describe, expect, it } from "vitest";

describe("Integration: Layered Application Wiring", () => {
  it("wires a database, logger, config, and auth service through one container", async () => {
    const container = new Container();

    container.bind(DatabaseToken).toClass(SqlDatabase, []).inSingleton();
    container.bind(LoggerToken).toClass(ConsoleLogger).inSingleton();
    container.bind(ConfigToken).toFactory(() => new AppConfig({ env: "test" }));
    container
      .bind(AuthToken)
      .toClass(SessionAuth, [DatabaseToken, LoggerToken]);

    const auth = container.resolve(AuthToken);
    expect(auth.isAuthenticated("valid-token")).toBe(true);
    expect(auth.isAuthenticated("wrong-token")).toBe(false);

    const logger = container.resolve(LoggerToken) as ConsoleLogger;
    expect(logger.logs).toEqual(["auth:valid-token", "auth:wrong-token"]);

    const config = container.resolve(ConfigToken);
    expect(config.get("env")).toBe("test");
    expect(config.get("missing")).toBe("");

    const database = container.resolve(DatabaseToken) as SqlDatabase;
    await expect(database.query("SELECT 1")).resolves.toBe("result:SELECT 1");
    expect(database.queries).toEqual(["SELECT 1"]);
  });

  it("shares inherited singletons with untainted scopes", () => {
    const container = new Container();
    container.bind(DatabaseToken).toClass(SqlDatabase, []).inSingleton();
    container.bind(LoggerToken).toClass(ConsoleLogger).inSingleton();
    container
      .bind(AuthToken)
      .toClass(SessionAuth, [DatabaseToken, LoggerToken]);

    const scopeA = container.scope();
    const scopeB = container.scope();

    expect(scopeA.resolve(DatabaseToken)).toBe(
      container.resolve(DatabaseToken),
    );
    expect(scopeB.resolve(LoggerToken)).toBe(container.resolve(LoggerToken));

    scopeA.resolve(AuthToken).isAuthenticated("valid-token");
    scopeB.resolve(AuthToken).isAuthenticated("valid-token");

    // Ambos scopes usaron el mismo Logger compartido con el contenedor raíz
    const logger = container.resolve(LoggerToken) as ConsoleLogger;
    expect(logger.logs).toHaveLength(2);
  });

  it("isolates a scope's singleton once one of its dependencies is overridden", () => {
    const container = new Container();
    container.bind(DatabaseToken).toClass(SqlDatabase, []).inSingleton();
    container.bind(LoggerToken).toClass(ConsoleLogger).inSingleton();
    container
      .bind(AuthToken)
      .toClass(SessionAuth, [DatabaseToken, LoggerToken])
      .inSingleton();

    const testScope = container.scope();
    const fakeLogger = new ConsoleLogger();
    testScope.override(LoggerToken).toValue(fakeLogger);

    const scopedAuth = testScope.resolve(AuthToken);
    scopedAuth.isAuthenticated("valid-token");
    expect(fakeLogger.logs).toEqual(["auth:valid-token"]);

    // El singleton de producción nunca ve el logger falso del scope
    const prodAuth = container.resolve(AuthToken) as SessionAuth;
    expect(prodAuth.logger).not.toBe(fakeLogger);
    expect(prodAuth.logger).toBeInstanceOf(ConsoleLogger);
  });
});
