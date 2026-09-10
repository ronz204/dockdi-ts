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
  it("binds and resolves class instances with dependencies", async () => {
    const EngineToken = token<Engine>("Engine");
    const CarToken = token<Car>("Car");

    const container = new Container();
    container.bind(EngineToken).toClass(Engine, []).inSingletonScope();
    container.bind(CarToken).toClass(Car, [EngineToken]);

    const car = await container.resolve(CarToken);
    expect(car).toBeInstanceOf(Car);
    expect(car.engine).toBeInstanceOf(Engine);

    car.engine.start();
    expect(car.engine.started).toBe(true);

    const car2 = await container.resolve(CarToken);
    expect(car2.engine.started).toBe(true);
    expect(car2.engine).toBe(car.engine);
  });

  it("binds values directly", async () => {
    const ConfigToken = token<{ port: number }>("Config");
    const container = new Container();

    container.bind(ConfigToken).toValue({ port: 8080 });

    const config = await container.resolve(ConfigToken);
    expect(config.port).toBe(8080);
  });

  it("binds async factories", async () => {
    const AsyncDataToken = token<string>("AsyncData");
    const container = new Container();

    container.bind(AsyncDataToken).toFactory(async () => {
      return "async-payload";
    }, []);

    const data = await container.resolve(AsyncDataToken);
    expect(data).toBe("async-payload");
  });

  it("clears cached singletons on reset()", async () => {
    const CounterToken = token<{ id: number }>("Counter");
    const container = new Container();
    let count = 0;

    container
      .bind(CounterToken)
      .toFactory(() => ({ id: ++count }), [])
      .inSingletonScope();

    const first = await container.resolve(CounterToken);
    expect(first.id).toBe(1);

    const cached = await container.resolve(CounterToken);
    expect(cached.id).toBe(1);

    container.reset();

    const recreated = await container.resolve(CounterToken);
    expect(recreated.id).toBe(2);
  });
});
