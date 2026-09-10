import { delay } from "@helpers/fixtures";
import { Container, token } from "dockdi";
import { describe, expect, it } from "vitest";

describe("Integration: Asynchronous Lifecycle and Concurrency", () => {
  it("deduplicates concurrent async resolutions for singleton", async () => {
    const AsyncToken = token<{ timestamp: number }>("AsyncTimestamp");
    const container = new Container();
    let invocations = 0;

    container
      .bind(AsyncToken)
      .toFactory(async () => {
        invocations++;
        await delay(25);
        return { timestamp: Date.now() };
      }, [])
      .inSingletonScope();

    const tasks = Array.from({ length: 10 }, () =>
      container.resolve(AsyncToken),
    );
    const results = await Promise.all(tasks);

    expect(invocations).toBe(1);
    const first = results[0];
    for (const res of results) {
      expect(res).toBe(first);
    }
  });

  it("resolves multi-tiered asynchronous graph correctly", async () => {
    const DbToken = token<{ connection: string }>("Db");
    const CacheToken = token<{ redis: string }>("Cache");
    const AppToken = token<{ ready: boolean }>("App");

    const container = new Container();

    container
      .bind(DbToken)
      .toFactory(async () => {
        await delay(15);
        return { connection: "postgres://ready" };
      }, [])
      .inSingletonScope();

    container
      .bind(CacheToken)
      .toFactory(async () => {
        await delay(10);
        return { redis: "redis://connected" };
      }, [])
      .inSingletonScope();

    container
      .bind(AppToken)
      .toFactory(
        async (db, cache) => {
          expect((db as { connection: string }).connection).toBe(
            "postgres://ready",
          );
          expect((cache as { redis: string }).redis).toBe("redis://connected");
          return { ready: true };
        },
        [DbToken, CacheToken],
      )
      .inSingletonScope();

    const app = await container.resolve(AppToken);
    expect(app.ready).toBe(true);
  });
});
