# dockdi

Type-first dependency injection library for TypeScript, built on explicit branded tokens (phantom types) instead of decorators and `reflect-metadata`. Targets compile-time-safe dependency wiring without tooling gymnastics (no `tsconfig.json` flags, no `Reflect` polyfills) and with zero production dependencies.

---

## Knowledge base layout

| Path | Holds |
|---|---|
| `.claude/docs/` | Self-contained reference files, one concern each — vision, module reference, topology, persistence, mechanism reference, build approach |
| `.claude/rules/` | Conventions auto-loaded when a matching file is opened/edited, scoped via `paths:` frontmatter |
| `.claude/skills/` | This project's delta-workflow skills (`surveyor`, `specifier`, `archivist`, `sentinel`) |
| `.claude/settings.json` | Permission policy — see Permissions below |
| `deltas/` | Per-slice spec/design/plan files: `<slice>.spec.md`, optional `<slice>.design.md`, optional `<slice>.plan.md` |

This knowledge base governs `.claude/` only. The repo also carries a separate, independent harness under `.agents/` (with its own root `AGENTS.md`) for a different agent tool — the two are not kept in sync and edits to one don't imply the other.

## Repo layout

| Path | Purpose |
|---|---|
| `source/` | Library source |
| `testing/` | Test suites (unit, integration, benchmarks, helpers) |
| `deltas/` | Per-slice spec/design/plan files — see Knowledge base layout above |

The repo root is the package itself — `package.json`, `tsconfig.json`, and the rest of the Bun/build config sit directly at the top level; there's no nested package directory.

## Setup & common commands

All commands run directly from the repo root.

| Task | Command |
|---|---|
| Install dependencies | `bun install` |
| Run typecheck | `bun run typecheck` |
| Run tests | `bun run test` |
| Watch tests | `bun run test:watch` |
| Lint | `bun run lint` |
| Lint (auto-fix) | `bun run lint:fix` |
| Format | `bun run format` |
| Build | `bun run build` |

## Permissions

The full policy lives in `.claude/settings.json`. Read-only git/inspection commands and web search are pre-approved; destructive git operations (`push`, `pull`) and reading `.env`/`secrets/**` are denied by default.

## Conventions

Project-wide invariants (zero decorators/`reflect-metadata`, zero production dependencies, strictly synchronous resolution via `container.resolve(token): T`) are each enforced via their own file under `.claude/rules/` rather than restated here — see that directory when touching library source or the package manifest.

---

## Non-goals

Asynchronous dependency resolution, property injection, and decorator-based metadata extraction are excluded for v1 — see `.claude/docs/approach.md` and `.claude/docs/overview.md` for the current scope boundary.
