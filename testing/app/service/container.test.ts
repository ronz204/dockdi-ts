import { Container, token } from "dockdi";
import { describe, expect, it } from "vitest";

class Engine {
  public started = false;
  public start(): void {
    this.started = true;
  }
}

class Car {
  constructor(public readonly engine: Engine) {}
}

describe("Container Public Facade", () => {
  it("binds and resolves class instances with dependencies via resolve()", () => {
    const EngineToken = token<Engine>("Engine");
    const CarToken = token<Car>("Car");

    const container = new Container();
    container.bind(EngineToken).toClass(Engine).inSingleton();
    container.bind(CarToken).toClass(Car, [EngineToken]);

    const car = container.resolve(CarToken);
    expect(car).toBeInstanceOf(Car);
    expect(car.engine).toBeInstanceOf(Engine);

    car.engine.start();
    expect(car.engine.started).toBe(true);

    const car2 = container.resolve(CarToken);
    expect(car2.engine.started).toBe(true);
    expect(car2.engine).toBe(car.engine);
  });

  it("binds values directly", () => {
    const ConfigToken = token<{ port: number }>("Config");
    const container = new Container();

    container.bind(ConfigToken).toValue({ port: 8080 });

    const config = container.resolve(ConfigToken);
    expect(config.port).toBe(8080);
  });

  it("binds factories with zero-arg inference", () => {
    const FactoryDataToken = token<string>("FactoryData");
    const container = new Container();

    container.bind(FactoryDataToken).toFactory(() => "factory-payload");

    const data = container.resolve(FactoryDataToken);
    expect(data).toBe("factory-payload");
  });

  it("clears cached singletons on reset()", () => {
    const CounterToken = token<{ id: number }>("Counter");
    const container = new Container();
    let count = 0;

    container
      .bind(CounterToken)
      .toFactory(() => ({ id: ++count }))
      .inSingleton();

    const first = container.resolve(CounterToken);
    expect(first.id).toBe(1);

    const cached = container.resolve(CounterToken);
    expect(cached.id).toBe(1);

    container.reset();

    const recreated = container.resolve(CounterToken);
    expect(recreated.id).toBe(2);
  });

  it("supports has() to check token registration", () => {
    const BoundToken = token<string>("Bound");
    const UnboundToken = token<string>("Unbound");
    const container = new Container();

    container.bind(BoundToken).toValue("present");

    expect(container.has(BoundToken)).toBe(true);
    expect(container.has(UnboundToken)).toBe(false);
  });

  it("loads modular definitions via load()", () => {
    const TokenA = token<string>("TokenA");
    const TokenB = token<string>("TokenB");
    const container = new Container();

    container.load(
      (c) => c.bind(TokenA).toValue("moduleA"),
      (c) => c.bind(TokenB).toValue("moduleB"),
    );

    expect(container.resolve(TokenA)).toBe("moduleA");
    expect(container.resolve(TokenB)).toBe("moduleB");
  });

  it("returns the container instance from load() for chaining", () => {
    const container = new Container();
    const result = container.load(() => {});

    expect(result).toBe(container);
  });

  it("shares an inherited singleton with an untainted scope", () => {
    const CounterToken = token<{ id: number }>("SharedCounter");
    const root = new Container();
    let count = 0;

    root
      .bind(CounterToken)
      .toFactory(() => ({ id: ++count }))
      .inSingleton();

    const child = root.scope();

    expect(child.resolve(CounterToken)).toBe(root.resolve(CounterToken));
  });

  it("scopes reset() to the container it's called on", () => {
    const ClockToken = token<{ now: () => string }>("ScopedClock");
    const CounterToken = token<{ label: string }>("ScopedCounter");
    const root = new Container();

    root.bind(ClockToken).toValue({ now: () => "prod" });
    root
      .bind(CounterToken)
      .toFactory(
        (clock: { now: () => string }) => ({ label: clock.now() }),
        [ClockToken],
      )
      .inSingleton();

    const child = root.scope();
    child.override(ClockToken).toValue({ now: () => "fake" });

    const fromChild = child.resolve(CounterToken);
    expect(fromChild.label).toBe("fake");

    child.reset();

    const rebuiltChild = child.resolve(CounterToken);
    expect(rebuiltChild).not.toBe(fromChild);
    expect(rebuiltChild.label).toBe("fake");

    // El padre nunca tuvo el override, así que su propio caché no se ve afectado
    expect(root.resolve(CounterToken).label).toBe("prod");
  });
});
