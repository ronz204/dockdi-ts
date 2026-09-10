# Lifecycle Scopes — Spec

> Instance lifetime policies governing caching, referential identity, resolution context isolation, and concurrent promise deduplication.

## Intent

Provide fine-grained lifecycle management for container bindings to govern when instances are created, shared, and discarded. Supports container-wide singletons (`singleton`) with concurrent promise deduplication for asynchronous factories, per-resolution contextual sharing (`resolution`), and default independent instantiations (`transient`), accompanied by deterministic cache invalidation via `container.reset()`.

## Scope

- **Owns**:
  - `ScopedBindingBuilder` fluent chaining interface exposing `.inSingletonScope()`, `.inTransientScope()`, and `.inResolutionScope()`.
  - Integration of scope selection into `.toClass()` and `.toFactory()` registration builders.
  - Singleton instance caching (`Map<Token<unknown>, unknown>`) and in-flight promise deduplication (`Map<Token<unknown>, Promise<unknown>>`) bound to each `Container` instance.
  - Ephemeral resolution context (`Map<Token<unknown>, Promise<unknown>>`) created per top-level `container.resolve()` execution and discarded when resolution completes.
  - Referential identity guarantees:
    - `singleton`: identical reference (`===`) across all `resolve()` invocations on the same container.
    - `resolution`: identical reference (`===`) across shared dependencies within the same resolution tree, fresh instance across separate top-level calls.
    - `transient`: distinct instance (`!==`) on every resolution.
  - Cache clearing method `container.reset()` which purges all cached singleton instances and in-flight promises while preserving registered bindings.
- **Non-goals**:
  - Circular dependency detection with cycle path traces (owned by `error-diagnostics` in Phase 3).
  - Hierarchical container scoping or child container inheritance (deferred to Phase 6).

## Contract

```typescript
import type { Token } from "@core/token";
import type { Assembler, TokensForArgs } from "@core/assembler";

export type ScopeType = "transient" | "singleton" | "resolution";

export interface ScopedBindingBuilder {
  inSingletonScope(): void;
  inTransientScope(): void;
  inResolutionScope(): void;
}

export interface BindingBuilder<T> {
  toClass<Args extends readonly unknown[]>(
    target: Assembler<T, Args>,
    tokens: TokensForArgs<Args>,
  ): ScopedBindingBuilder;
  toValue(value: T): void;
  toFactory<Args extends readonly unknown[]>(
    factory: (...args: Args) => T | Promise<T>,
    tokens: TokensForArgs<Args>,
  ): ScopedBindingBuilder;
}

export class Container {
  bind<T>(token: Token<T>): BindingBuilder<T>;
  resolve<T>(token: Token<T>): Promise<T>;
  reset(): void;
}
```

### Operational Guarantees

| Scope Policy | Within Same Resolution Tree | Across Distinct Invocations | Storage Location | Lifetime |
|---|---|---|---|---|
| `transient` (default) | Fresh instance per dependency path | Fresh instance per invocation | None | Garbage-collected when references drop |
| `singleton` | Shared identical reference (`===`) | Shared identical reference (`===`) | Container instance cache + in-flight cache | Lives until `container.reset()` or container is GC'd |
| `resolution` | Shared identical reference (`===`) across tree | Fresh instance per invocation | Ephemeral resolution context | Discarded when root resolution completes |

Constant value bindings registered via `.toValue()` inherently preserve reference equality and are unaffected by `reset()`.

## Invariants

- **Singleton identity**: Successive `container.resolve()` calls for a singleton-scoped token return the exact same instance reference (`a === b`).
- **Concurrent promise deduplication**: Concurrent invocations of `container.resolve(token)` for an asynchronous singleton share the exact same pending `Promise<T>` reference (`p1 === p2`), preventing duplicate asynchronous factory executions and race conditions.
- **Resolution-scope isolation**: In a diamond graph (`A -> B, C; B -> D; C -> D`), when `D` is `resolution`-scoped, `B.d === C.d` holds within the same resolution call, but `call1.b.d !== call2.b.d` holds across calls.
- **Container cache boundary**: Singleton caches are isolated to each `Container` instance. Two containers with identical bindings instantiate independent singletons.
- **Binding preservation on reset**: `container.reset()` purges all cached singleton instances and in-flight promises without deleting, modifying, or corrupting registered bindings.
- **Zero production dependencies**: Scoping mechanics rely solely on native JavaScript `Map` and `Promise` primitives without external state managers or polyfills.
- **Declaration isolation**: All methods and interfaces provide explicit return types satisfying `isolatedDeclarations: true`.

## Deferred / Open questions

- Hierarchical child containers with parent resolution fallback and localized singletons are deferred to Phase 6.

## Acceptance criteria

- Diamond dependency graph tests confirm:
  - `singleton`: `B.d === C.d` and `call1.d === call2.d`.
  - `resolution`: `B.d === C.d` within a single call, and `call1.b.d !== call2.b.d` across calls.
  - `transient`: `B.d !== C.d` in all scenarios.
- Concurrent `container.resolve()` invocations on an async singleton execute the factory exactly once and return the same resolved reference.
- Calling `container.reset()` purges singleton instances, causing subsequent resolutions to instantiate and cache fresh instances.
- Type tests verify that `.inSingletonScope()`, `.inTransientScope()`, and `.inResolutionScope()` are accessible on `toClass()` and `toFactory()`.
- `bun run typecheck`, `bun test`, and `bun run lint` pass with 0 errors.

---

Last updated: 2026-09-10.
