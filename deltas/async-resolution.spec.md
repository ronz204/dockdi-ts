# Async Resolution — Spec

> Opt-in asynchronous dependency resolution supporting async factory bindings, safe promise deduplication for singletons, and strict isolation of synchronous resolution pathways.

## Intent

Provide asynchronous factory registration (`tpAsync`) and non-blocking dependency resolution (`container.resolveAsync()`) for dependencies requiring asynchronous initialization (e.g. database connection pools, remote config fetching), while protecting the synchronous path (`container.get()`) from promise contamination or unhandled promise rejections.

## Scope

- **Owns**:
  - `tpAsync(factoryFn, tokens)` fluent registration method on `BindingBuilder<T>`.
  - Scoping support (`inSingletonScope()`, `inTransientScope()`, `inResolutionScope()`) on `tpAsync`.
  - Asynchronous container resolution method `container.resolveAsync<T>(token): Promise<T>`.
  - Concurrent `Promise` deduplication for async singleton factories (caching the pending `Promise` during resolution so concurrent calls return the exact same promise instance).
  - Synchronous execution guard: throwing `AsyncBindingError` when `container.get()` encounters an `async` binding or any dependency path containing an async factory.
  - Cycle detection for asynchronous dependency resolution pipelines (`CircularDependencyError`).
  - Cache clearing for async singletons via `container.reset()`.
- **Non-goals**:
  - Async property injection or ambient global container locators.
  - Auto-promoted promise resolution in `container.get()` (synchronous `get()` strictly forbids resolving promises).
  - Distributed container resolution over network streams (deferred to Phase 7).

## Contract

```typescript
export type BindingType = "class" | "factory" | "value" | "async";
export type ScopeType = "transient" | "singleton" | "resolution";

export interface BindingBuilder<T> {
  toClass<Args extends readonly unknown[]>(
    target: Constructor<T, Args>,
    tokens: TokensForArgs<Args>,
  ): ScopedBindingBuilder;
  toValue(value: T): void;
  toFactory<Args extends readonly unknown[]>(
    factory: (...args: Args) => T,
    tokens: TokensForArgs<Args>,
  ): ScopedBindingBuilder;
  tpAsync<Args extends readonly unknown[]>(
    factory: (...args: Args) => Promise<T> | T,
    tokens: TokensForArgs<Args>,
  ): ScopedBindingBuilder;
}

export class AsyncBindingError extends DockdiError {
  readonly token: Token<unknown>;
  readonly activeStack: readonly Token<unknown>[];
  constructor(token: Token<unknown>, activeStack: readonly Token<unknown>[]);
}

export class Container {
  bind<T>(token: Token<T>): BindingBuilder<T>;
  get<T>(token: Token<T>): T;
  resolveAsync<T>(token: Token<T>): Promise<T>;
  reset(): void;
}
```

### Operational Guarantees

| Resolution Method | Binding Type | Outcome | Concurrent Behavior |
|---|---|---|---|
| `container.resolveAsync(token)` | `async` | Returns `Promise<T>` resolving to dependency | Shared pending `Promise` for `singleton` scope |
| `container.resolveAsync(token)` | `class` / `factory` / `value` | Seamlessly resolves synchronous dependencies inside `Promise<T>` | Respects specified scope policies |
| `container.get(token)` | `async` (or transitive async dep) | Throws `AsyncBindingError` synchronously | Fails fast prior to executing factory |

## Invariants

- **Synchronous isolation**: Synchronous `container.get(token)` NEVER returns a `Promise` instance or `[object Promise]`. If an async factory is encountered anywhere in the resolution chain, `get()` throws `AsyncBindingError`.
- **Concurrent deduplication**: Concurrent invocations of `container.resolveAsync(token)` for an async singleton share the exact same pending `Promise<T>` reference (`promise1 === promise2`) to prevent duplicate initialization side-effects.
- **Async cycle safety**: Asynchronous resolution checks the active stack before resolving child dependencies and throws `CircularDependencyError` with the full cycle trace if a cycle is detected.
- **Scope parity**: `tpAsync` supports `.inSingletonScope()`, `.inTransientScope()`, and `.inResolutionScope()` with identical lifetime semantics as synchronous factories.
- **Reset completeness**: `container.reset()` invalidates cached async singletons and pending promises, forcing subsequent `resolveAsync()` calls to trigger fresh initialization.
- **Declaration isolation**: All methods and type declarations adhere strictly to `isolatedDeclarations: true`.
- **Zero production dependencies**: Implemented using standard JavaScript Promises and native maps without external async helper libraries.

## Deferred / Open questions

- Parallel dependency resolution for independent arguments via `Promise.all` — will be evaluated for optimization if performance profiling indicates argument serial bottleneck.

## Acceptance criteria

- `tpAsync` allows registering asynchronous factories returning `Promise<T>`.
- Calling `container.get()` on an async binding or a tree containing an async factory throws `AsyncBindingError`.
- Calling `container.resolveAsync()` successfully resolves both synchronous and asynchronous dependency trees.
- Concurrent `container.resolveAsync()` calls for an async singleton deduplicate in-flight promises (`p1 === p2`).
- Asynchronous circular dependencies (`A -> B -> A` with async nodes) throw `CircularDependencyError` without leaking unhandled rejections.
- `container.reset()` clears cached async singletons.
- All unit tests pass under `bun test` and `vitest run`.
- `bun run typecheck`, `bun run lint`, and `bun run build` complete with 0 errors.

---

Last updated: 2026-09-09.
