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
  it("binds and resolves class instances with dependencies", () => {
    const EngineToken = token<Engine>("Engine");
    const CarToken = token<Car>("Car");

    const container = new Container();
    container.bind(EngineToken).toClass(Engine, []).inSingletonScope();
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

  it("binds factories", () => {
    const FactoryDataToken = token<string>("FactoryData");
    const container = new Container();

    container.bind(FactoryDataToken).toFactory(() => "factory-payload", []);

    const data = container.resolve(FactoryDataToken);
    expect(data).toBe("factory-payload");
  });

  it("clears cached singletons on reset()", () => {
    const CounterToken = token<{ id: number }>("Counter");
    const container = new Container();
    let count = 0;

    container
      .bind(CounterToken)
      .toFactory(() => ({ id: ++count }), [])
      .inSingletonScope();

    const first = container.resolve(CounterToken);
    expect(first.id).toBe(1);

    const cached = container.resolve(CounterToken);
    expect(cached.id).toBe(1);

    container.reset();

    const recreated = container.resolve(CounterToken);
    expect(recreated.id).toBe(2);
  });
});
