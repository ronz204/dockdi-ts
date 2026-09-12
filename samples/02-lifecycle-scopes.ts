import { Container, token } from "dockdi";

class Instance {
  public readonly id = Math.random().toString(36).slice(2, 8);
}

const TransientToken = token<Instance>("TransientInstance");
const SingletonToken = token<Instance>("SingletonInstance");
const ResolutionToken = token<Instance>("ResolutionInstance");

interface Shared {
  readonly stamp: string;
}

const SharedToken = token<Shared>("Shared");

class BranchA {
  constructor(public readonly shared: Shared) {}
}

class BranchB {
  constructor(public readonly shared: Shared) {}
}

const BranchAToken = token<BranchA>("BranchA");
const BranchBToken = token<BranchB>("BranchB");

class Root {
  constructor(
    public readonly branchA: BranchA,
    public readonly branchB: BranchB,
  ) {}
}

const RootToken = token<Root>("Root");

const container = new Container();

// transient is the default scope, no explicit call needed
container.bind(TransientToken).toClass(Instance);

container.bind(SingletonToken).toClass(Instance).inSingleton();

container
  .bind(SharedToken)
  .toFactory(() => ({ stamp: Math.random().toString(36).slice(2, 8) }))
  .inResolution();
container.bind(BranchAToken).toClass(BranchA, [SharedToken]);
container.bind(BranchBToken).toClass(BranchB, [SharedToken]);
container.bind(RootToken).toClass(Root, [BranchAToken, BranchBToken]);
container.bind(ResolutionToken).toClass(Instance).inResolution();

const transientA = container.resolve(TransientToken);
const transientB = container.resolve(TransientToken);
console.log(
  `transient: distinct instances -> ${transientA.id !== transientB.id}`,
);

const singletonA = container.resolve(SingletonToken);
const singletonB = container.resolve(SingletonToken);
console.log(`singleton: same instance -> ${singletonA === singletonB}`);

// branchA and branchB are resolved within the same top-level resolve() call,
// so they share one resolution-scoped instance
const root = container.resolve(RootToken);
console.log(
  `resolution: shared within one resolve() call -> ${
    root.branchA.shared.stamp === root.branchB.shared.stamp
  }`,
);

const resolutionA = container.resolve(ResolutionToken);
const resolutionB = container.resolve(ResolutionToken);
console.log(
  `resolution: distinct across separate resolve() calls -> ${
    resolutionA.id !== resolutionB.id
  }`,
);
