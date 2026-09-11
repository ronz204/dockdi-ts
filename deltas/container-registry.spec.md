# Container Registry — Spec

> Central dependency injection container managing type-safe token bindings, synchronous factories, and strictly synchronous instance resolution.

## Intent

Provide a lightweight, reflection-free dependency injection container that pairs branded tokens with providers (constructors, constant values, synchronous factory functions) via a fluent registration API, storing them in an internal registry and resolving dependencies through a strictly synchronous resolution engine (`container.resolve<T>(token): T`) under default transient scope, with built-in circular dependency detection and actionable error diagnostics.

## Scope

- **Owns**:
  - `Container` class exposing registration (`bind`), overrides (`override`), membership checks (`has`), child scoping (`scope`), module loading (`load`), and synchronous resolution (`resolve`) interfaces.
  - `BindingBuilder<T>` fluent builder providing `.toClass()`, `.toValue()`, and `.toFactory()`; `.toClass()`/`.toFactory()` return a scope builder (`.inSingleton()`, `.inTransient()`, `.inResolution()`) defaulting to `transient`.
  - Synchronous factory and class registration with a positional token tuple checked at compile time against the target's parameter types, so a mismatched token type or arity is a compile error.
  - Internal binding representation (`Binding<T>`) and registry storage (`Map<Token<unknown>, Binding<unknown>>`).
  - Instance lifecycle caching for `singleton` (per-container `SingletonCache`) and `resolution` (per-resolve-call `ResolutionCache`) scopes, disposing evicted/cleared instances via a `dispose()`/`Symbol.dispose` hook when present.
  - Re-binding prevention policy: throwing an explicit conflict error (`BindingConflictError`) if a token is registered more than once via `.bind()`; `.override()` requires the token already be bound somewhere in the container or its ancestor chain, throwing `MissingTokenError` otherwise.
  - Hierarchical/child containers via `scope()`: a child holds its own registry and singleton cache, falls back to the parent's resolver for any token it doesn't register itself, and never leaks a locally-cached singleton (even one built through a local override) into the parent's cache.
  - Grouping related bindings into reusable units via `load(...modules: readonly Module[])`, where `Module = (container: Container) => void`.
  - Strictly synchronous recursive dependency resolution (`resolve<T>(token: Token<T>): T`) resolving classes, factories, and values immediately.
  - Resolution stack tracking (`activeStack`) detecting circular dependencies before call stack exhaustion and throwing `CircularDependencyError`.
  - Missing token error reporting with complete resolution call path (`MissingTokenError`).
  - Default lifecycle policy: `transient` scope (each resolution call yields a fresh, independent instance).
- **Non-goals**:
  - Asynchronous dependency resolution or Promise-returning factories (asynchronous initialization belongs in application bootstrap, passing resolved instances to the container via `.toValue()`).
  - Property injection or decorator-based metadata extraction.

## Contract

```typescript
import type { Constructor, TokensArg } from "@core/assembler";
import type { Token } from "@core/token";

export type BindingType = "class" | "factory" | "value";
export type ScopeType = "transient" | "singleton" | "resolution";

export interface Binding<_T = unknown> {
  scope: ScopeType;
  readonly type: BindingType;
  readonly provider: unknown;
  readonly deps?: readonly Token<unknown>[];
}

export interface ScopeBuilder {
  inSingleton(): void;
  inTransient(): void;
  inResolution(): void;
}

export interface BindingBuilder<T> {
  toValue(value: T): void;
  toClass<Args extends readonly unknown[]>(
    target: Constructor<T, Args>,
    ...[tokens]: TokensArg<Args>
  ): ScopeBuilder;
  toFactory<Args extends readonly unknown[]>(
    factory: (...args: Args) => T,
    ...[tokens]: TokensArg<Args>
  ): ScopeBuilder;
}

export type Module = (container: Container) => void;

export class Container {
  bind<T>(token: Token<T>): BindingBuilder<T>;
  override<T>(token: Token<T>): BindingBuilder<T>;
  has(token: Token<unknown>): boolean;
  resolve<T>(token: Token<T>): T;
  scope(): Container;
  load(...modules: readonly Module[]): this;
  reset(): void;
}
```

### Operational Guarantees

| Operation | Input State | Behavior | Failure Condition |
|---|---|---|---|
| `bind(token).toClass(C, tokens)` | Token not registered | Stores class binding with `transient` scope and dependencies | Throws error if token already bound; compile error if tokens mismatch constructor parameters |
| `bind(token).toValue(value)` | Token not registered | Stores constant value binding | Throws error if token already bound; compile error if value is not assignable to `T` |
| `bind(token).toFactory(fn, tokens)` | Token not registered | Stores synchronous factory binding with `transient` scope and dependencies | Throws error if token already bound; compile error if tokens mismatch factory parameters |
| `bind(token)` (duplicate) | Token already registered | Throws `BindingConflictError` immediately when completing builder | Throws error identifying duplicate token |
| `resolve(token)` | Token registered | Recursively resolves dependencies synchronously in depth-first order, returning `T` directly | Throws `MissingTokenError` if token is missing; throws `CircularDependencyError` if a cycle is detected |
| `resolve(token)` (transient) | Token registered as class/factory | Each invocation evaluates a fresh instance (`instanceA !== instanceB`) | — |
| `resolve(token)` (singleton) | Token registered as class/factory `.inSingleton()` | First call instantiates and caches; later calls on the same container/scope return the identical cached instance | — |
| `override(token).toValue/toClass/toFactory(...)` | Token bound locally or on an ancestor | Replaces the binding in the local registry and invalidates any locally cached singleton for that token | Throws `MissingTokenError` if the token isn't bound anywhere in the container/ancestor chain |
| `container.scope()` | — | Returns a new child `Container` with its own registry and singleton cache, delegating to the parent's resolver for tokens it doesn't register itself | — |
| `has(token)` | — | Returns whether the token is registered locally or on an ancestor | — |

## Invariants

- **Strictly synchronous resolution**: `container.resolve(token)` returns `T` synchronously in nanoseconds without promises, `await`, microtasks, or function coloring.
- **Strict compile-time alignment**: `toClass` and `toFactory` enforce that dependency token tuples match parameter length, order, and types using `TokensArg`.
- **Synchronous factory registration**: `toFactory` accepts synchronous factories returning `T`.
- **Cycle detection**: Resolution maintains an active stack; if a token is requested while already present in `activeStack`, execution immediately throws `CircularDependencyError` without stack overflow.
- **Actionable diagnostics**: Unregistered tokens throw `MissingTokenError` showing the full resolution path.
- **Immutable registration**: Once bound, a token cannot be re-registered via `bind()`. Attempting to register an already bound token throws `BindingConflictError`.
- **Transient isolation**: Under default transient scope, resolving a class or factory produces distinct instances on successive resolution invocations.
- **Singleton identity**: Under singleton scope, resolving the same token on the same container (or the same scope) always returns the identical cached instance.
- **Scope isolation**: A child container's own registrations and locally-cached singletons are never visible to, and never mutate, its parent — even when a singleton built through a child-local override is transitively required by a binding the child inherited from the parent.
- **Zero production dependencies**: The container uses native JavaScript `Map` and standard language constructs without external runtime packages.
- **Declaration isolation**: The `Container` class, `BindingBuilder`, and public types include explicit type annotations compatible with `isolatedDeclarations: true`.

## Deferred / Open questions

None currently — bind/override/has/scope/load/resolve/reset and the transient/singleton/resolution lifecycles are all implemented and covered by the test suite.

## Acceptance criteria

- Linear dependency graphs (e.g. `A -> B -> C`) resolve successfully and synchronously via `container.resolve(tokenA)`.
- Synchronous factories registered with `toFactory` resolve successfully via `container.resolve(token)`.
- Circular dependencies (`A -> B -> A`) throw `CircularDependencyError` printing the cycle trace.
- Resolving an unregistered token throws `MissingTokenError` including the resolution path.
- Calling `container.resolve(token)` multiple times for transient bindings returns distinct object references.
- Calling `container.bind(token)` twice for the same token throws `BindingConflictError`.
- Calling `container.override(token)` on a token never bound in the container or its ancestors throws `MissingTokenError`.
- A `container.scope()` child's local override of an inherited singleton dependency is visible within that scope but never mutates the parent's own cached instance or a sibling scope's.
- Static type tests verify compile errors when passing incompatible types to `toValue`, `toClass`, or `toFactory`.
- `bun test`, `bun run test`, `bun run typecheck`, and `bun run lint` succeed with 0 errors.

---

Last updated: 2026-09-11.
