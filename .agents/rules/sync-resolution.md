---
paths:
  - "source/**"
---

# Strictly Synchronous Resolution Conventions

Applies to the library's resolution and binding interfaces. Resolution in dockdi is 100% synchronous, deterministic, and fast.

---

## Synchronous resolution via `container.resolve(token): T`

- `container.resolve(token): T` is strictly synchronous. It directly returns the resolved instance `T` without `await`, promises, or event-loop microtasks.
- `toFactory` accepts strictly synchronous factory functions `(...args: Args) => T`.
- All provider types (`toClass`, `toFactory`, `toValue`) and scopes (`transient`, `singleton`, `resolution`) execute and resolve synchronously.
- Singletons are cached synchronously upon first resolution in `SingletonStorage` (`Map<Token<unknown>, unknown>`), without in-flight promise tracking or asynchronous locks.
- Circular dependencies are detected during the synchronous recursive traversal and abort immediately by throwing `CircularDependencyError`.

---

## Non-goals

- Does not support asynchronous factory functions returning `Promise<T>`.
- Does not provide asynchronous resolution or in-flight promise deduplication.
- Asynchronous resource setup (e.g. database connections, fetching remote secrets) belongs in the application bootstrap phase, passing the connected client to `container.bind(token).toValue(client)`.
