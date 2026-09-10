import { Container, type Token, token } from "dockdi";
import { bench, group, run } from "mitata";

function createChainContainer(depth: number): {
  container: Container;
  root: Token<unknown>;
} {
  const container = new Container();
  const root = token<unknown>("node_0");
  let previous = root;

  for (let i = 1; i < depth; i++) {
    const current = token<unknown>(`node_${i}`);
    container.bind(previous).toFactory((child) => ({ child }), [current]);
    previous = current;
  }

  container.bind(previous).toFactory(() => "leaf", []);

  return { container, root };
}

const chain10 = createChainContainer(10);
const chain25 = createChainContainer(25);
const chain50 = createChainContainer(50);

group("Linear Chain Depth Resolution", () => {
  bench("depth 10", async () => {
    await chain10.container.resolve(chain10.root);
  });

  bench("depth 25", async () => {
    await chain25.container.resolve(chain25.root);
  });

  bench("depth 50", async () => {
    await chain50.container.resolve(chain50.root);
  });
});

await run();
