---
paths:
  - "source/**"
  - "libraries/dockdi-ts/source/**"
---

# Unified Async and Sync Resolution Conventions

Applies to the library's resolution and binding interfaces. Both synchronous and asynchronous factories are first-class, natively supported capabilities of dockdi.

---

## Universal resolution via `resolve()` and synchronous convenience via `get()`

- `toFactory` accepts factory functions returning either `T` or `Promise<T>` polymorphically without requiring separate registration methods (`toAsync` is excluded).
- `container.resolve(token)` is the universal asynchronous resolution method. It resolves the entire dependency graph, awaiting asynchronous dependencies, deduplicating concurrent in-flight promises for singletons, and instantiating synchronous classes or values without penalty.
- `container.get(token)` is a synchronous convenience method. It executes strictly synchronously for dependency trees that contain only synchronous providers. If an asynchronous dependency is encountered anywhere in the resolution path, `get()` immediately throws `AsyncBindingError`, directing the caller to use `await container.resolve(token)`.

---

## Non-goals

Does not return `T | Promise<T>` from a single resolution method, preserving deterministic return types and compile-time ergonomics in TypeScript.
