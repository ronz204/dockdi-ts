import { Container, token } from "dockdi";
import { describe, expect, it } from "vitest";

describe("Integration: Resolution Lifecycle and Multi-Tiered Graphs", () => {
  it("resolves multi-tiered synchronous dependency graph correctly", () => {
    const DbToken = token<{ connection: string }>("Db");
    const CacheToken = token<{ redis: string }>("Cache");
    const AppToken = token<{ ready: boolean; db: string; cache: string }>(
      "App",
    );

    const container = new Container();

    container
      .bind(DbToken)
      .toFactory(() => ({ connection: "postgres://ready" }), [])
      .inSingletonScope();

    container
      .bind(CacheToken)
      .toFactory(() => ({ redis: "redis://connected" }), [])
      .inSingletonScope();

    container
      .bind(AppToken)
      .toFactory(
        (db, cache) => ({
          ready: true,
          db: (db as { connection: string }).connection,
          cache: (cache as { redis: string }).redis,
        }),
        [DbToken, CacheToken],
      )
      .inSingletonScope();

    const app = container.resolve(AppToken);
    expect(app.ready).toBe(true);
    expect(app.db).toBe("postgres://ready");
    expect(app.cache).toBe("redis://connected");
  });

  it("coordinates singleton, transient, and resolution-scoped instances in complex tree", () => {
    const SingletonToken = token<{ id: number }>("Singleton");
    const TransientToken = token<{ id: number }>("Transient");
    const ResolutionToken = token<{ id: number }>("Resolution");
    const RootToken = token<{
      s: { id: number };
      t1: { id: number };
      t2: { id: number };
      r1: { id: number };
      r2: { id: number };
    }>("Root");

    let sCount = 0;
    let tCount = 0;
    let rCount = 0;

    const container = new Container();

    container
      .bind(SingletonToken)
      .toFactory(() => ({ id: ++sCount }), [])
      .inSingletonScope();

    container
      .bind(TransientToken)
      .toFactory(() => ({ id: ++tCount }), [])
      .inTransientScope();

    container
      .bind(ResolutionToken)
      .toFactory(() => ({ id: ++rCount }), [])
      .inResolutionScope();

    const BranchAToken = token<{
      s: { id: number };
      t: { id: number };
      r: { id: number };
    }>("BranchA");
    const BranchBToken = token<{
      s: { id: number };
      t: { id: number };
      r: { id: number };
    }>("BranchB");

    container.bind(BranchAToken).toFactory(
      (s, t, r) => ({
        s: s as { id: number },
        t: t as { id: number },
        r: r as { id: number },
      }),
      [SingletonToken, TransientToken, ResolutionToken],
    );

    container.bind(BranchBToken).toFactory(
      (s, t, r) => ({
        s: s as { id: number },
        t: t as { id: number },
        r: r as { id: number },
      }),
      [SingletonToken, TransientToken, ResolutionToken],
    );

    container.bind(RootToken).toFactory(
      (a, b) => {
        const branchA = a as {
          s: { id: number };
          t: { id: number };
          r: { id: number };
        };
        const branchB = b as {
          s: { id: number };
          t: { id: number };
          r: { id: number };
        };
        return {
          s: branchA.s,
          t1: branchA.t,
          t2: branchB.t,
          r1: branchA.r,
          r2: branchB.r,
        };
      },
      [BranchAToken, BranchBToken],
    );

    const first = container.resolve(RootToken);
    expect(first.r1).toBe(first.r2);
    expect(first.t1).not.toBe(first.t2);

    const second = container.resolve(RootToken);
    expect(second.s).toBe(first.s);
    expect(second.r1).not.toBe(first.r1);
    expect(second.r1).toBe(second.r2);
  });
});
