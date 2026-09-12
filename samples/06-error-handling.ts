import {
  BindingConflictError,
  CircularDependencyError,
  Container,
  DockdiError,
  InstantiationError,
  MissingTokenError,
  token,
} from "dockdi";

// missing token

interface Repository {
  find(id: string): unknown;
}

const RepositoryToken = token<Repository>("Repository");

const container = new Container();

try {
  container.resolve(RepositoryToken);
} catch (error) {
  if (error instanceof MissingTokenError) {
    console.log("Caught MissingTokenError:");
    console.log(error.message);
  }
}

// circular dependency

interface ServiceA {
  readonly name: string;
}
interface ServiceB {
  readonly name: string;
}

class ServiceAImpl implements ServiceA {
  public readonly name = "A";
  constructor(public readonly dependency: ServiceB) {}
}

class ServiceBImpl implements ServiceB {
  public readonly name = "B";
  constructor(public readonly dependency: ServiceA) {}
}

const ServiceAToken = token<ServiceA>("ServiceA");
const ServiceBToken = token<ServiceB>("ServiceB");

const cyclicContainer = new Container();
cyclicContainer.bind(ServiceAToken).toClass(ServiceAImpl, [ServiceBToken]);
cyclicContainer.bind(ServiceBToken).toClass(ServiceBImpl, [ServiceAToken]);

try {
  cyclicContainer.resolve(ServiceAToken);
} catch (error) {
  if (error instanceof CircularDependencyError) {
    console.log("Caught CircularDependencyError:");
    console.log(error.message);
  }
}

// binding conflict

const conflictContainer = new Container();
conflictContainer.bind(RepositoryToken).toValue({ find: () => undefined });

try {
  conflictContainer.bind(RepositoryToken).toValue({ find: () => undefined });
} catch (error) {
  if (error instanceof BindingConflictError) {
    console.log("Caught BindingConflictError:");
    console.log(error.message);
  }
}

// instantiation failure

interface FaultyService {
  readonly ready: boolean;
}

class FaultyServiceImpl implements FaultyService {
  public readonly ready = true;

  constructor() {
    throw new Error("connection refused");
  }
}

const FaultyServiceToken = token<FaultyService>("FaultyService");

const faultyContainer = new Container();
faultyContainer.bind(FaultyServiceToken).toClass(FaultyServiceImpl);

try {
  faultyContainer.resolve(FaultyServiceToken);
} catch (error) {
  if (error instanceof InstantiationError) {
    console.log("Caught InstantiationError:");
    console.log(error.message);
    console.log(`original cause -> ${(error.cause as Error).message}`);
  }
}

// catching any dockdi failure through the common base class

try {
  conflictContainer.resolve(token<never>("NeverBound"));
} catch (error) {
  if (error instanceof DockdiError) {
    console.log(`Caught via base DockdiError (${error.name})`);
  }
}
