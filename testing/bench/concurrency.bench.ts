import { Container, token } from "dockdi";
import { bench, group, run } from "mitata";

const AsyncSingleton = token<{ id: number }>("AsyncSingleton");

let counter = 0;
const container = new Container();
container
  .bind(AsyncSingleton)
  .toFactory(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1));
    return { id: ++counter };
  }, [])
  .inSingletonScope();

group("Concurrent In-Flight Promise Deduplication", () => {
  bench("100 parallel resolves (first resolution contention)", async () => {
    container.reset();
    const tasks = Array.from({ length: 100 }, () =>
      container.resolve(AsyncSingleton),
    );
    await Promise.all(tasks);
  });

  bench("100 parallel resolves (cached singleton)", async () => {
    const tasks = Array.from({ length: 100 }, () =>
      container.resolve(AsyncSingleton),
    );
    await Promise.all(tasks);
  });
});

await run();
