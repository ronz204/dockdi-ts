import {
  type Binding,
  type BindingBuilder,
  type Class,
  type Constructor,
  Container,
  type ScopeBuilder,
  type ScopeType,
  type Token,
  type TokensArg,
  token,
} from "dockdi";

// mirrors BindingBuilder.toClass's own signature: TokensArg makes the
// tokens tuple optional for a zero-arg constructor, required otherwise
function registerSingletonClass<T, Args extends readonly unknown[]>(
  container: Container,
  identifier: Token<T>,
  target: Constructor<T, Args>,
  ...tokens: TokensArg<Args>
): void {
  const builder: BindingBuilder<T> = container.bind(identifier);
  const scope: ScopeBuilder = builder.toClass(target, ...tokens);
  scope.inSingleton();
}

interface Clock {
  now(): Date;
}

class SystemClock implements Clock {
  public now(): Date {
    return new Date();
  }
}

const ClockToken: Token<Clock> = token<Clock>("Clock");

const container = new Container();
registerSingletonClass(container, ClockToken, SystemClock);

console.log(
  `resolved via typed helper -> ${container.resolve(ClockToken).now().toISOString()}`,
);

class NamedService {
  public readonly label = "named-service";
}

const namedServiceClass: Class<NamedService> = NamedService;
const NamedServiceToken = token<NamedService>(namedServiceClass);
container.bind(NamedServiceToken).toClass(NamedService);
console.log(`token description -> ${NamedServiceToken.description}`);

function scopeLabel(scope: ScopeType): string {
  return `scope: ${scope}`;
}
console.log(scopeLabel("singleton"));

// Binding<T> describes dockdi's internal registration shape; exported so
// tooling built on dockdi can describe a binding without depending on its
// internal registry implementation
function describeBinding<T>(binding: Binding<T>): string {
  return `${binding.type} binding, scope=${binding.scope}, deps=${
    binding.deps?.length ?? 0
  }`;
}

const clockBindingShape: Binding<Clock> = {
  type: "class",
  scope: "singleton",
  provider: SystemClock,
  deps: [],
};
console.log(describeBinding(clockBindingShape));
