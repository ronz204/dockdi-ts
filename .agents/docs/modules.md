# Modules

This document provides the per-component functional specification, execution flows, and data contracts for `dockdi`.

---

## `Token`

**Purpose.** Factory and branded type construct generating unique, type-safe dependency identifiers at runtime with zero overhead.

**Flow.**
1. The consumer invokes the token creation function with an optional description string.
2. The runtime creates a unique `Symbol(description)`.
3. The symbol is cast to a branded type carrying compile-time type parameter `T`.
4. The token is returned as an immutable reference usable in binding and resolution calls.

**Data shape.**
```typescript
declare const __brand: unique symbol;

export type Token<T> = symbol & {
  readonly [__brand]: T;
};
```

## `Binding`

**Purpose.** Encapsulates the strategy and lifecycle configuration associated with a token in the container registry.

**Flow.**
1. Created via the fluent binding builder exposed by `Container.bind(token)`.
2. Stores the resolution strategy (`toClass`, `toFactory`, `toValue`), parameter token dependencies, and assigned scope.
3. Consumed by the resolver to instantiate or retrieve instances.

**Data shape.**
```typescript
export type BindingType = "class" | "factory" | "value";
export type ScopeType = "transient" | "singleton" | "resolution";

export interface Binding<T> {
  readonly type: BindingType;
  readonly scope: ScopeType;
  readonly provider: unknown;
  readonly dependencies?: readonly Token<unknown>[];
}
```

## `Container`

**Purpose.** Central registration and resolution facade orchestrating binding maps and dispatching requests to the resolver engine.

**Flow.**
1. Initialization creates an empty token-to-binding registry and a singleton instance storage.
2. `bind(token)` returns a builder to register class, synchronous factory, or value bindings.
3. `override(token)` returns a builder to override bindings in testing, invalidating cached singleton instances.
4. `scope()` creates a child container that inherits from the current container with isolated local registrations.
5. `resolve(token)` delegates to the resolver, returning the resolved instance `T` strictly synchronously in nanoseconds.
6. `reset()` clears all cached singleton instances.

**Data shape.**
```typescript
export interface Container {
  bind<T>(token: Token<T>): BindingBuilder<T>;
  override<T>(token: Token<T>): BindingBuilder<T>;
  has(token: Token<unknown>): boolean;
  resolve<T>(token: Token<T>): T;
  scope(): Container;
  load(...modules: readonly Module[]): this;
  reset(): void;
}
```

## `Resolver`

**Purpose.** Core synchronous graph traversal engine that resolves dependencies, tracks active resolution call stacks, detects cycles, and enforces scoping policies.

**Flow.**
1. Receives the requested token and active resolution session.
2. Checks whether the token exists in the active resolution stack; if present, aborts immediately by throwing `CircularDependencyError` detailing the cycle chain.
3. Verifies token is registered; if missing, throws `MissingTokenError` detailing the resolution path.
4. Checks the instance cache if the binding specifies singleton scope; returns cached reference if found.
5. Checks the resolution storage if resolution-scoped; returns cached reference within the current session if found.
6. If dependencies are declared, recursively resolves each child dependency token synchronously.
7. Instantiates the target class or evaluates the synchronous factory using the resolved child instances.
8. Stores the result in storage if singleton or resolution-scoped.
9. Returns the constructed instance `T` synchronously.

**Data shape.**
```typescript
export interface ResolutionSession {
  readonly activeStack: readonly Token<unknown>[];
  readonly resolutionStorage: ResolutionStorage;
}
```

---

## Non-goals

Components will not provide JSON serialization or deserialization of registered container graphs, and will not support runtime mutation of existing bindings once the container is sealed.
