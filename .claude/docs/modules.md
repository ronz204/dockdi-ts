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
1. Created via the fluent binding builder exposed by `Container.bind(token)`; throws `BindingConflictError` if the token is already registered, which is what forces callers to go through `Container.override(token)` to replace an existing binding instead.
2. Stores the resolution strategy (`toClass`, `toFactory`, `toValue`), parameter token dependencies, and assigned scope.
3. `toClass` and `toFactory` return a scope builder defaulting to `transient`, with `.inSingleton()` / `.inTransient()` / `.inResolution()` to select the lifecycle explicitly; `toValue` bindings carry no meaningful scope, since the resolver returns their stored value directly.
4. Consumed by the resolver to instantiate or retrieve instances.

**Data shape.**
```typescript
export type BindingType = "class" | "factory" | "value";
export type ScopeType = "transient" | "singleton" | "resolution";

export interface Binding<T> {
  readonly type: BindingType;
  readonly scope: ScopeType;
  readonly provider: unknown;
  readonly deps?: readonly Token<unknown>[];
}
```

## `Container`

**Purpose.** Central registration and resolution facade orchestrating binding maps and dispatching requests to the resolver engine, with optional parent/child linkage for scoped containers.

**Flow.**
1. Initialization creates an empty token-to-binding registry and a singleton instance cache, optionally linked to a parent container passed at construction.
2. `bind(token)` returns a builder to register class, synchronous factory, or value bindings; throws `BindingConflictError` if the token is already registered.
3. `override(token)` returns a builder that replaces an existing binding in place, first invalidating any cached singleton instance for that token.
4. `has(token)` reports whether a token is registered locally, falling back to the parent container's `has` when it is not.
5. `resolve(token)` delegates to the resolver, returning the resolved instance `T` strictly synchronously in nanoseconds.
6. `scope()` creates a child container backed by its own registry and singleton cache, whose resolver falls back to the parent container's resolver for any token not registered locally.
7. `load(...modules)` invokes each `Module` function (`(container: Container) => void`) against this container, for grouping related bindings into reusable units.
8. `reset()` clears all cached singleton instances.

**Data shape.**
```typescript
export type Module = (container: Container) => void;

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

**Purpose.** Core synchronous graph traversal engine that resolves dependencies, tracks active resolution call stacks, detects cycles, enforces scoping policies, and falls back to a parent container's resolver for tokens not registered locally.

**Flow.**
1. Receives the requested token and creates a fresh per-call trace (active resolution stack plus a resolution-scoped cache). The resolver `resolve()` was originally called on runs the entire call tree below — it never hands execution to a different resolver instance.
2. Checks whether the token is already in the active resolution stack; if present, aborts immediately by throwing `CircularDependencyError` detailing the cycle chain.
3. Walks from itself up through ancestor resolvers (via `Container.scope()`'s parent link) to find the first one whose own registry has the token; throws `MissingTokenError` with the current resolution path if none do. Restarting this walk from the original resolver on every dependency lookup — rather than from whichever ancestor happens to own the current binding — is what lets a scope-local override stay visible through a binding it inherits from an ancestor.
4. Value bindings return their stored value immediately, bypassing all caching.
5. Checks its own singleton cache if the binding specifies singleton scope; returns the cached instance if found, otherwise instantiates and caches it there. Caching always happens on the resolver `resolve()` was originally called on, never on the ancestor that owns the binding — so a singleton built using a scope-local override never leaks into that ancestor's own cache.
6. Checks the resolution-scoped cache (unique to this top-level `resolve()` call) if the binding specifies resolution scope; returns the cached instance if found, otherwise instantiates and caches it there for the remainder of this resolution.
7. Transient bindings instantiate fresh on every resolution, with no caching.
8. If dependencies are declared, recursively resolves each child dependency token synchronously before instantiating.
9. Instantiates the target class or evaluates the synchronous factory using the resolved child instances, wrapping any non-`DockdiError` thrown during instantiation in `InstantiationError`.
10. Returns the constructed instance `T` synchronously.

**Data shape.**
```typescript
class Trace {
  readonly stack: Token<unknown>[];
  readonly cache: ResolutionCache;
}
```

---

## Non-goals

Components will not provide JSON serialization or deserialization of registered container graphs, and will not support runtime mutation of existing bindings once the container is sealed.
