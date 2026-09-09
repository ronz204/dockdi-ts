# Container Registry — Spec

> Central dependency injection container managing type-safe token bindings and synchronous transient instance resolution.

## Intent

Provide a lightweight, reflection-free dependency injection container that pairs branded tokens with providers (constructors, constant values, factory functions) via a fluent registration API, storing them in an internal registry and resolving dependencies synchronously under default transient scope.

## Scope

- **Owns**:
  - `Container` class exposing registration (`bind`) and retrieval (`get`) interfaces.
  - `BindingBuilder<T>` fluent builder providing `.toClass()`, `.toValue()`, and `.toFactory()`.
  - Internal binding representation (`Binding<T>`) and registry storage (`Map<Token<unknown>, Binding<unknown>>`).
  - Re-binding prevention policy: throwing an explicit conflict error if a token is registered more than once.
  - Synchronous recursive dependency resolution (`get<T>(token: Token<T>): T`) instantiating target classes and evaluating factories.
  - Default lifecycle policy: `transient` scope (each resolution call yields a fresh, independent instance).
  - Missing token error reporting when resolving an unregistered token.
- **Non-goals**:
  - Singleton caching or lifecycle scopes beyond transient (owned by `lifecycle-scopes` in Phase 2).
  - Full resolution stack tracking, graph cycle detection, and circular dependency diagnostic traces (owned by `diagnostics` in Phase 3).
  - Asynchronous factory bindings or asynchronous resolution (`resolveAsync`) (owned by `async-resolution` in Phase 4).
  - Test overrides, container snapshots, or hierarchical child containers (owned by `testing-utils` in Phase 5 and Phase 7).

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
    factory: (...args: Args) => T,
    tokens: TokensForArgs<Args>,
  ): void;
}

export class Container {
  bind<T>(token: Token<T>): BindingBuilder<T>;
  get<T>(token: Token<T>): T;
}
```

### Operational Guarantees

| Operation | Input State | Behavior | Failure Condition |
|---|---|---|---|
| `bind(token).toClass(C, tokens)` | Token not registered | Stores class binding with `transient` scope and dependencies | Throws error if token already bound; compile error if tokens mismatch constructor parameters |
| `bind(token).toValue(value)` | Token not registered | Stores constant value binding | Throws error if token already bound; compile error if value is not assignable to `T` |
| `bind(token).toFactory(fn, tokens)` | Token not registered | Stores factory binding with `transient` scope and dependencies | Throws error if token already bound; compile error if tokens mismatch factory parameters |
| `bind(token)` (duplicate) | Token already registered | Throws conflict error immediately when calling `bind(token)` or completing builder | Throws error identifying duplicate token |
| `get(token)` | Token registered | Recursively resolves dependencies and returns resolved instance `T` | Throws error if token or any transitive dependency is missing |
| `get(token)` (transient) | Token registered as class/factory | Each `get()` call evaluates a fresh instance (`instanceA !== instanceB`) | — |

## Invariants

- **Strict compile-time alignment**: `toClass` and `toFactory` enforce that dependency token tuples match parameter length, order, and types using `TokensForArgs`.
- **Immutable registration**: Once bound, a token cannot be re-registered via `bind()`. Attempting to register an already bound token throws a conflict error.
- **Transient isolation**: Under default transient scope, resolving a class or factory produces distinct instances on successive `get()` invocations.
- **Synchronous resolution**: Resolution is entirely synchronous. No Promises are generated or returned by `get()`.
- **Zero production dependencies**: The container uses native JavaScript `Map` and function/constructor execution without external runtime packages.
- **Declaration isolation**: The `Container` class, `BindingBuilder`, and public types include explicit type annotations compatible with `isolatedDeclarations: true`.

## Deferred / Open questions

- Lifecycle caching (`singleton`, `resolution-scope`) is deferred to Phase 2 (`lifecycle-scopes`).
- Dedicated error class hierarchies (`MissingTokenError`, `BindingConflictError`, `CircularDependencyError`) will be fully implemented in Phase 3 (`diagnostics`).

## Acceptance criteria

- Linear dependency graphs (e.g. `A -> B -> C`) resolve successfully via `container.get(tokenA)`.
- Calling `container.get(token)` multiple times for transient class and factory bindings returns distinct object references.
- Calling `container.get(unregisteredToken)` throws an error identifying the missing token.
- Calling `container.bind(token)` twice for the same token throws a conflict error.
- Static type tests verify compile errors when passing incompatible types to `toValue`, `toClass`, or `toFactory`.
- `bun test`, `bun run test`, `bun run typecheck`, and `bun run lint` succeed with 0 errors.

---

Last updated: 2026-09-09.
