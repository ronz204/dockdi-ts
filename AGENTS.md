# dockdi

Type-first dependency injection library for TypeScript based on explicit branded tokens (phantom types) instead of decorators and runtime reflection metadata. Delivers compile-time type safety with zero reflection overhead and zero production dependencies.

---

## Knowledge base layout

| Path | Holds |
|---|---|
| `.agents/docs/` | Self-contained technical reference documents (overview, approach, structure, modules, expertise, database) |
| `.agents/rules/` | Project conventions loaded conditionally based on file paths matching `paths:` glob patterns |
| `.agents/skills/` | Reusable skills for knowledge management and delta workflow (`surveyor`, `specifier`, `archivist`, `sentinel`) |
| `deltas/` | Per-slice specification, design, and roadmap documents (`<slice>.spec.md`, `<slice>.design.md`, `<slice>.plan.md`) |

## Repo layout

| Path | Purpose |
|---|---|
| `source/` | Library source |
| `testing/` | Test suites (unit, integration, benchmarks, helpers) |
| `.agents/` | Agent harness containing project documentation, editing rules, and delta workflow skills |

The repo root is the package itself — `package.json`, `tsconfig.json`, and the rest of the Bun/build config sit directly at the top level; there's no nested package directory.

## Setup & common commands

All development workflows operate through Bun directly at the repo root:

| Task | Command |
|---|---|
| Install dependencies | `bun install` |
| Run tests | `bun test` |
| Run typecheck | `bun x tsc --noEmit` |

## Conventions

- Dependency injection is strictly token-driven via branded phantom types (`Token<T>`); decorators (`@inject`) and `reflect-metadata` are prohibited.
- Resolution execution is strictly synchronous: `container.resolve(token)` returns `T` directly without `await`, promises, or event-loop overhead.
- Published library code maintains zero runtime dependencies.
- Changes to knowledge-base files under `.agents/` or delta contracts under `deltas/` route through `archivist` per `.agents/rules/kb-edit-routing.md`.

---

## Non-goals

`dockdi` does not support asynchronous dependency resolution, property injection, decorator metadata extraction, or ambient global container locators. Asynchronous resource initialization (e.g., establishing database connections or fetching secrets) belongs in the application bootstrap phase, passing resolved instances to the container via `.toValue()`.
