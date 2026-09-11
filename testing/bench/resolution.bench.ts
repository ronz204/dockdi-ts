import { Container, token } from "dockdi";
import { bench, group, run } from "mitata";

const TransientToken = token<{ id: number }>("Transient");
const SingletonToken = token<{ id: number }>("Singleton");
const ResolutionToken = token<{ id: number }>("Resolution");

let count = 0;
const container = new Container();
container
  .bind(TransientToken)
  .toFactory(() => ({ id: ++count }))
  .inTransient();
container
  .bind(SingletonToken)
  .toFactory(() => ({ id: ++count }))
  .inSingleton();
container
  .bind(ResolutionToken)
  .toFactory(() => ({ id: ++count }))
  .inResolution();

container.get(SingletonToken);

group("Scope Resolution Comparison", () => {
  bench("transient resolution", () => {
    container.get(TransientToken);
  });

  bench("singleton resolution (warm cache)", () => {
    container.get(SingletonToken);
  });

  bench("resolution scope resolution", () => {
    container.get(ResolutionToken);
  });
});

await run();
