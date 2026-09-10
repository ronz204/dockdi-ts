import { Container, token } from "dockdi";
import { bench, group, run } from "mitata";

const TransientToken = token<{ id: number }>("Transient");
const SingletonToken = token<{ id: number }>("Singleton");
const ResolutionToken = token<{ id: number }>("Resolution");

let count = 0;
const container = new Container();
container
  .bind(TransientToken)
  .toFactory(() => ({ id: ++count }), [])
  .inTransientScope();
container
  .bind(SingletonToken)
  .toFactory(() => ({ id: ++count }), [])
  .inSingletonScope();
container
  .bind(ResolutionToken)
  .toFactory(() => ({ id: ++count }), [])
  .inResolutionScope();

await container.resolve(SingletonToken);

group("Scope Resolution Comparison", () => {
  bench("transient resolution", async () => {
    await container.resolve(TransientToken);
  });

  bench("singleton resolution (warm cache)", async () => {
    await container.resolve(SingletonToken);
  });

  bench("resolution scope resolution", async () => {
    await container.resolve(ResolutionToken);
  });
});

await run();
