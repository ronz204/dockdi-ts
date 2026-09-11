import { Container, type Token, token } from "dockdi";
import { bench, group, run } from "mitata";

function createFanoutContainer(count: number): {
  container: Container;
  root: Token<unknown>;
} {
  const container = new Container();
  const root = token<unknown>("root");
  const deps: Token<unknown>[] = [];

  for (let i = 0; i < count; i++) {
    const dep = token<number>(`leaf_${i}`);
    container.bind(dep).toFactory(() => i);
    deps.push(dep);
  }

  container.bind(root).toFactory((...args: unknown[]) => args, deps);
  return { container, root };
}

const fanout5 = createFanoutContainer(5);
const fanout15 = createFanoutContainer(15);
const fanout30 = createFanoutContainer(30);

group("Fan-out Dependency Resolution", () => {
  bench("fan-out 5 dependencies", () => {
    fanout5.container.get(fanout5.root);
  });

  bench("fan-out 15 dependencies", () => {
    fanout15.container.get(fanout15.root);
  });

  bench("fan-out 30 dependencies", () => {
    fanout30.container.get(fanout30.root);
  });
});

await run();
