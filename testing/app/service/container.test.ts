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
  it("binds and resolves class instances with dependencies via get()", () => {
    const EngineToken = token<Engine>("Engine");
    const CarToken = token<Car>("Car");

    const container = new Container();
    container.bind(EngineToken).toClass(Engine).inSingleton();
    container.bind(CarToken).toClass(Car, [EngineToken]);

    const car = container.get(CarToken);
    expect(car).toBeInstanceOf(Car);
    expect(car.engine).toBeInstanceOf(Engine);

    car.engine.start();
    expect(car.engine.started).toBe(true);

    const car2 = container.get(CarToken);
    expect(car2.engine.started).toBe(true);
    expect(car2.engine).toBe(car.engine);
  });

  it("binds values directly", () => {
    const ConfigToken = token<{ port: number }>("Config");
    const container = new Container();

    container.bind(ConfigToken).toValue({ port: 8080 });

    const config = container.get(ConfigToken);
    expect(config.port).toBe(8080);
  });

  it("binds factories with zero-arg inference", () => {
    const FactoryDataToken = token<string>("FactoryData");
    const container = new Container();

    container.bind(FactoryDataToken).toFactory(() => "factory-payload");

    const data = container.get(FactoryDataToken);
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

    const first = container.get(CounterToken);
    expect(first.id).toBe(1);

    const cached = container.get(CounterToken);
    expect(cached.id).toBe(1);

    container.reset();

    const recreated = container.get(CounterToken);
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

    expect(container.get(TokenA)).toBe("moduleA");
    expect(container.get(TokenB)).toBe("moduleB");
  });
});
