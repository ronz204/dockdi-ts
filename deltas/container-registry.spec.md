# Container Registry — Spec

> Central dependency injection container managing type-safe token bindings, polymorphic sync/async factories, and unified asynchronous instance resolution.

## Intent

Provide a lightweight, reflection-free dependency injection container that pairs branded tokens with providers (constructors, constant values, polymorphic sync/async factory functions) via a fluent registration API, storing them in an internal registry and resolving dependencies through a unified asynchronous resolution engine (`container.resolve`) under default transient scope, with built-in circular dependency detection and actionable error diagnostics.

## Scope

- **Owns**:
  - `Container` class exposing registration (`bind`) and universal asynchronous resolution (`resolve`) interfaces.
  - `BindingBuilder<T>` fluent builder providing `.toClass()`, `.toValue()`, and `.toFactory()`.
  - Polymorphic factory registration in `.toFactory()` accepting factory functions returning either `T` or `Promise<T>`.
  - Internal binding representation (`Binding<T>`) and registry storage (`Map<Token<unknown>, Binding<unknown>>`).
  - Re-binding prevention policy: throwing an explicit conflict error (`BindingConflictError`) if a token is registered more than once.
  - Unified asynchronous recursive dependency resolution (`resolve<T>(token: Token<T>): Promise<T>`) resolving classes, factories, and values transparently.
  - Resolution stack tracking (`activeStack`) detecting circular dependencies before call stack exhaustion and throwing `CircularDependencyError`.
  - Missing token error reporting with intelligent near-miss suggestions via Levenshtein distance (`MissingTokenError`).
  - Default lifecycle policy: `transient` scope (each resolution call yields a fresh, independent instance).
- **Non-goals**:
  - Singleton caching or lifecycle scopes beyond transient (owned by `lifecycle-scopes` in Phase 2).
  - Test overrides, container snapshots, or hierarchical child containers (owned by `testing-utils` in Phase 4 and Phase 6).

## Contract

```typescript
import type { Token } from "@core/token";
import type { Assembler, TokensForArgs } from "@core/assembler";

export type BindingType = "class" | "factory" | "value";
export type ScopeType = "transient" | "singleton" | "resolution";

export interface Binding<_T = unknown> {
  scope: ScopeType;
  readonly type: BindingType;
  readonly provider: unknown;
  readonly dependencies?: readonly Token<unknown>[];
}

export interface ScopedBindingBuilder {
  inSingletonScope(): void;
  inTransientScope(): void;
  inResolutionScope(): void;
}

export interface BindingBuilder<T> {
  toValue(value: T): void;
  toClass<Args extends readonly unknown[]>(
    target: Assembler<T, Args>,
    tokens: TokensForArgs<Args>,
  ): ScopedBindingBuilder;
  toFactory<Args extends readonly unknown[]>(
    factory: (...args: Args) => T | Promise<T>,
    tokens: TokensForArgs<Args>,
  ): ScopedBindingBuilder;
}

export class Container {
  bind<T>(token: Token<T>): BindingBuilder<T>;
  resolve<T>(token: Token<T>): Promise<T>;
}
```

### Operational Guarantees

| Operation | Input State | Behavior | Failure Condition |
|---|---|---|---|
| `bind(token).toClass(C, tokens)` | Token not registered | Stores class binding with `transient` scope and dependencies | Throws error if token already bound; compile error if tokens mismatch constructor parameters |
| `bind(token).toValue(value)` | Token not registered | Stores constant value binding | Throws error if token already bound; compile error if value is not assignable to `T` |
| `bind(token).toFactory(fn, tokens)` | Token not registered | Stores factory binding (sync or async) with `transient` scope and dependencies | Throws error if token already bound; compile error if tokens mismatch factory parameters |
| `bind(token)` (duplicate) | Token already registered | Throws `BindingConflictError` immediately when completing builder | Throws error identifying duplicate token |
| `resolve(token)` | Token registered | Recursively resolves dependencies concurrently (`Promise.all`), awaiting promises as needed, returning `Promise<T>` | Throws `MissingTokenError` if token is missing; throws `CircularDependencyError` if a cycle is detected |
| `resolve(token)` (transient) | Token registered as class/factory | Each invocation evaluates a fresh instance (`instanceA !== instanceB`) | — |

## Invariants

- **Single resolution engine**: All tokens (classes, sync factories, async factories, static values) are resolved asynchronously through a single unified engine returning `Promise<T>`.
- **Strict compile-time alignment**: `toClass` and `toFactory` enforce that dependency token tuples match parameter length, order, and types using `TokensForArgs`.
- **Polymorphic factory registration**: `toFactory` accepts both synchronous and asynchronous factories returning `T` or `Promise<T>` without requiring separate registration methods or flags.
- **Concurrent dependency resolution**: Sibling dependencies in any resolution node are resolved concurrently via `Promise.all`.
- **Cycle detection**: Resolution maintains an active stack; if a token is requested while already present in `activeStack`, execution immediately rejects with `CircularDependencyError` without stack overflow.
- **Actionable diagnostics**: Unregistered tokens reject with `MissingTokenError` showing the full resolution path and suggestions for near-miss tokens.
- **Immutable registration**: Once bound, a token cannot be re-registered via `bind()`. Attempting to register an already bound token throws `BindingConflictError`.
- **Transient isolation**: Under default transient scope, resolving a class or factory produces distinct instances on successive resolution invocations.
- **Zero production dependencies**: The container uses native JavaScript `Map`, Promises, and functions/constructors without external runtime packages.
- **Declaration isolation**: The `Container` class, `BindingBuilder`, and public types include explicit type annotations compatible with `isolatedDeclarations: true`.

## Deferred / Open questions

- Lifecycle caching (`singleton`, `resolution-scope`) and concurrent promise deduplication are deferred to Phase 2 (`lifecycle-scopes`).

## Acceptance criteria

- Linear dependency graphs (e.g. `A -> B -> C`) resolve successfully via `container.resolve(tokenA)`.
- Asynchronous factories registered with `toFactory` resolve successfully via `container.resolve(token)`.
- Classes depending on asynchronous factories resolve successfully via `container.resolve(token)`.
- Circular dependencies (`A -> B -> A`) reject with `CircularDependencyError` printing the cycle trace.
- Resolving an unregistered token rejects with `MissingTokenError` including near-miss suggestions.
- Calling `container.resolve(token)` multiple times for transient bindings returns distinct object references.
- Calling `container.bind(token)` twice for the same token throws `BindingConflictError`.
- Static type tests verify compile errors when passing incompatible types to `toValue`, `toClass`, or `toFactory`.
- `bun test`, `bun run test`, `bun run typecheck`, and `bun run lint` succeed with 0 errors.

---

Last updated: 2026-09-10.
