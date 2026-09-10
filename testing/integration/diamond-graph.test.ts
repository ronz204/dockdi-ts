import { Container, token } from "dockdi";
import { describe, expect, it } from "vitest";

class ServiceD {
  public readonly id = Math.random();
}

class ServiceB {
  constructor(public readonly d: ServiceD) {}
}

class ServiceC {
  constructor(public readonly d: ServiceD) {}
}

class ServiceA {
  constructor(
    public readonly b: ServiceB,
    public readonly c: ServiceC,
  ) {}
}

describe("Integration: Diamond Dependency Graph", () => {
  it("shares singleton dependency instance across sibling branches", async () => {
    const DToken = token<ServiceD>("D");
    const BToken = token<ServiceB>("B");
    const CToken = token<ServiceC>("C");
    const AToken = token<ServiceA>("A");

    const container = new Container();
    container.bind(DToken).toClass(ServiceD, []).inSingletonScope();
    container.bind(BToken).toClass(ServiceB, [DToken]);
    container.bind(CToken).toClass(ServiceC, [DToken]);
    container.bind(AToken).toClass(ServiceA, [BToken, CToken]);

    const a1 = await container.resolve(AToken);
    expect(a1.b.d).toBe(a1.c.d);

    const a2 = await container.resolve(AToken);
    expect(a2.b.d).toBe(a1.b.d);
  });

  it("shares resolution scope dependency within tree but isolates between trees", async () => {
    const DToken = token<ServiceD>("D");
    const BToken = token<ServiceB>("B");
    const CToken = token<ServiceC>("C");
    const AToken = token<ServiceA>("A");

    const container = new Container();
    container.bind(DToken).toClass(ServiceD, []).inResolutionScope();
    container.bind(BToken).toClass(ServiceB, [DToken]);
    container.bind(CToken).toClass(ServiceC, [DToken]);
    container.bind(AToken).toClass(ServiceA, [BToken, CToken]);

    const a1 = await container.resolve(AToken);
    expect(a1.b.d).toBe(a1.c.d);

    const a2 = await container.resolve(AToken);
    expect(a2.b.d).toBe(a2.c.d);
    expect(a1.b.d).not.toBe(a2.b.d);
  });

  it("creates distinct instances for transient dependencies across branches", async () => {
    const DToken = token<ServiceD>("D");
    const BToken = token<ServiceB>("B");
    const CToken = token<ServiceC>("C");
    const AToken = token<ServiceA>("A");

    const container = new Container();
    container.bind(DToken).toClass(ServiceD, []).inTransientScope();
    container.bind(BToken).toClass(ServiceB, [DToken]);
    container.bind(CToken).toClass(ServiceC, [DToken]);
    container.bind(AToken).toClass(ServiceA, [BToken, CToken]);

    const a = await container.resolve(AToken);
    expect(a.b.d).not.toBe(a.c.d);
  });
});
