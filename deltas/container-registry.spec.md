# Container Registry — Spec

> Central dependency injection container managing type-safe token bindings, polymorphic sync/async factories, and unified instance resolution.

## Intent

Provide a lightweight, reflection-free dependency injection container that pairs branded tokens with providers (constructors, constant values, polymorphic sync/async factory functions) via a fluent registration API, storing them in an internal registry and resolving dependencies via universal asynchronous resolution (`container.resolve`) and synchronous resolution (`container.get`) under default transient scope.

## Scope

- **Owns**:
  - `Container` class exposing registration (`bind`), universal resolution (`resolve`), and sync retrieval (`get`) interfaces.
  - `BindingBuilder<T>` fluent builder providing `.toClass()`, `.toValue()`, and `.toFactory()`.
  - Polymorphic factory registration in `.toFactory()` accepting factory functions returning either `T` or `Promise<T>`.
  - Internal binding representation (`Binding<T>`) and registry storage (`Map<Token<unknown>, Binding<unknown>>`).
  - Re-binding prevention policy: throwing an explicit conflict error if a token is registered more than once.
  - Universal asynchronous recursive dependency resolution (`resolve<T>(token: Token<T>): Promise<T>`) resolving mixed synchronous/asynchronous trees cleanly.
  - Synchronous recursive dependency resolution (`get<T>(token: Token<T>): T`) instantiating target classes and evaluating synchronous factories, failing fast with `AsyncBindingError` if any asynchronous dependency is encountered.
  - Default lifecycle policy: `transient` scope (each resolution call yields a fresh, independent instance).
  - Missing token error reporting when resolving an unregistered token.
- **Non-goals**:
  - Singleton caching or lifecycle scopes beyond transient (owned by `lifecycle-scopes` in Phase 2).
  - Full resolution stack tracking, graph cycle detection, and circular dependency diagnostic traces (owned by `error-diagnostics` in Phase 3).
  - Test overrides, container snapshots, or hierarchical child containers (owned by `testing-utils` in Phase 4 and Phase 6).

## Contract

```typescript
export type BindingType = "class" | "factory" | "value";
export type ScopeType = "transient" | "singleton" | "resolution";

export interface Binding<T> {
  readonly type: BindingType;
  readonly scope: ScopeType;
  readonly provider: unknown;
  readonly dependencies?: readonly Token<unknown>[];
}

export interface BindingBuilder<T> {
  toClass<Args extends readonly unknown[]>(
    target: Constructor<T, Args>,
    tokens: TokensForArgs<Args>,
  ): void;
  toValue(value: T): void;
  toFactory<Args extends readonly unknown[]>(
    factory: (...args: Args) => T | Promise<T>,
    tokens: TokensForArgs<Args>,
  ): void;
}

export class Container {
  bind<T>(token: Token<T>): BindingBuilder<T>;
  get<T>(token: Token<T>): T;
  resolve<T>(token: Token<T>): Promise<T>;
}
```

### Operational Guarantees

| Operation | Input State | Behavior | Failure Condition |
|---|---|---|---|
| `bind(token).toClass(C, tokens)` | Token not registered | Stores class binding with `transient` scope and dependencies | Throws error if token already bound; compile error if tokens mismatch constructor parameters |
| `bind(token).toValue(value)` | Token not registered | Stores constant value binding | Throws error if token already bound; compile error if value is not assignable to `T` |
| `bind(token).toFactory(fn, tokens)` | Token not registered | Stores factory binding (sync or async) with `transient` scope and dependencies | Throws error if token already bound; compile error if tokens mismatch factory parameters |
| `bind(token)` (duplicate) | Token already registered | Throws conflict error immediately when calling `bind(token)` or completing builder | Throws error identifying duplicate token |
| `resolve(token)` | Token registered | Recursively resolves dependencies (sync or async), awaiting promises as needed, returning `Promise<T>` | Throws error if token or any transitive dependency is missing |
| `get(token)` | Purely synchronous tree | Recursively resolves dependencies and returns resolved instance `T` | Throws error if token is missing; throws `AsyncBindingError` if any node in the graph is an async factory |
| `get(token)` or `resolve(token)` (transient) | Token registered as class/factory | Each invocation evaluates a fresh instance (`instanceA !== instanceB`) | — |

## Invariants

- **Strict compile-time alignment**: `toClass` and `toFactory` enforce that dependency token tuples match parameter length, order, and types using `TokensForArgs`.
- **Polymorphic factory registration**: `toFactory` accepts both synchronous and asynchronous factories returning `T` or `Promise<T>` without requiring separate registration methods or flags.
- **Universal asynchronous resolution**: `container.resolve(token)` returns a `Promise<T>` and handles any dependency tree containing sync, async, or mixed providers.
- **Synchronous safety**: `container.get(token)` executes strictly synchronously. It never returns a `Promise` instance or `[object Promise]`; if an asynchronous provider is encountered, `get()` immediately throws `AsyncBindingError`.
- **Immutable registration**: Once bound, a token cannot be re-registered via `bind()`. Attempting to register an already bound token throws a conflict error.
- **Transient isolation**: Under default transient scope, resolving a class or factory produces distinct instances on successive resolution invocations.
- **Zero production dependencies**: The container uses native JavaScript `Map`, Promises, and function/constructor execution without external runtime packages.
- **Declaration isolation**: The `Container` class, `BindingBuilder`, and public types include explicit type annotations compatible with `isolatedDeclarations: true`.

## Deferred / Open questions

- Lifecycle caching (`singleton`, `resolution-scope`) is deferred to Phase 2 (`lifecycle-scopes`).
- Dedicated error class hierarchies (`MissingTokenError`, `BindingConflictError`, `CircularDependencyError`) will be fully implemented in Phase 3 (`error-diagnostics`).

## Acceptance criteria

- Linear dependency graphs (e.g. `A -> B -> C`) resolve successfully via `container.get(tokenA)` and `container.resolve(tokenA)`.
- Asynchronous factories registered with `toFactory` resolve successfully via `container.resolve(token)`.
- Classes depending on asynchronous factories resolve successfully via `container.resolve(token)`.
- Calling `container.get()` on an async binding or tree containing an async factory throws `AsyncBindingError`.
- Calling `container.get(token)` or `container.resolve(token)` multiple times for transient bindings returns distinct object references.
- Calling `get` or `resolve` on an unregistered token throws `MissingTokenError`.
- Calling `container.bind(token)` twice for the same token throws `BindingConflictError`.
- Static type tests verify compile errors when passing incompatible types to `toValue`, `toClass`, or `toFactory`.
- `bun test`, `bun run test`, `bun run typecheck`, and `bun run lint` succeed with 0 errors.

---

Last updated: 2026-09-10.
