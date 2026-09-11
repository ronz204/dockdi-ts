# Structure

This file covers the technology stack, how the pieces will communicate, and infrastructure topology. The data model itself belongs in database.md, and it states plainly why that file is not applicable here.

---

## Stack

| Layer | Choice | Rationale |
|---|---|---|
| Language | TypeScript, strict mode | The type system is the primary safety mechanism this project relies on in place of runtime reflection — strict mode (no implicit any, no unchecked indexed access, no implicit override) is load-bearing, not incidental. |
| Runtime / package manager | Bun | Chosen to prototype and validate the core token/resolver mechanism directly, without a separate build step getting in the way during the design-validation phase. |
| Module resolution | Bundler-mode resolution, ESNext target | Matches how the compiled output is expected to be consumed by downstream bundlers rather than assuming a specific runtime's module loader. |
| Distribution format | Dual ESM/CJS build with bundled `.d.ts` | Consumers span both module systems; committing to only one would push the compatibility problem onto every consumer instead of solving it once at build time. This is a planned build-phase decision, not yet implemented. |

## Topology

dockdi is a library, not a service — it has no request path, no server process, and no network-reachable surface of its own. It is imported directly into a consuming application's composition root, where bindings are assembled once, and resolved calls happen in-process against the caller's own runtime.

```
consuming application
  └── composition root (assembles bindings once)
        └── container.resolve(token) — in-process, strictly synchronous
        └── container.scope() — child container, own registry + singleton
              cache, falls back to the parent for tokens it doesn't own
```

## Cross-cutting patterns

No cross-cutting patterns beyond the project-wide invariants apply — there is no cross-component behavior (auth, background jobs, logging) to describe, because the library has no components beyond the token/container/binding/scope concepts themselves. The invariants that do apply everywhere (zero decorators, zero production dependencies, strictly synchronous resolution with no async path at all) are each their own enforced convention rather than described here.

## Architecture decisions

- **Constructor-to-token mapping** is resolved as an explicit, positional tuple of tokens passed alongside the constructor or factory at bind time, typed as a mapped tuple over the target's parameter types. This makes a token that doesn't match its parameter's type, or a tuple of the wrong length, a compile error rather than a runtime surprise — closing the gap that a hand-maintained, order-dependent token list would otherwise leave open.
- **Hierarchical/child containers are in scope and shipped.** A child container is created from a parent, keeps its own registry and singleton cache, and falls back to the parent's resolver for any token it doesn't register itself — supporting isolated per-test scopes without a snapshot/restore mechanism.
- **Binding-method vocabulary is settled**: one verb-first method per provider strategy (a method for binding to a class, one for a factory, one for a fixed value) rather than a single generic method covering all three.
- **Resolution-scope shipped alongside transient and singleton** as a third lifecycle: an instance cached only for the duration of one top-level resolution call, shared across that call's dependency graph but not reused across separate resolutions.

---

## Non-goals

Nothing here describes hosting, provisioned infrastructure, or environments — dockdi is distributed as a published package with no runtime infrastructure of its own to operate.
