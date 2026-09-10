# Diagnostics — Spec

> Error diagnostic infrastructure, circular dependency detection, and missing-token remediation suggestions.

## Intent

Provide a dedicated, zero-dependency diagnostic error hierarchy (`DockdiError`, `CircularDependencyError`, `MissingTokenError`, `BindingConflictError`) that prevents call stack exhaustion on circular dependencies, prints complete resolution call paths, and offers Levenshtein-based near-miss token suggestions.

## Scope

- **Owns**:
  - `DockdiError` base class extending standard JavaScript `Error`.
  - `CircularDependencyError` class carrying `readonly cycle: readonly Token<unknown>[]`.
  - `MissingTokenError` class carrying `readonly token: Token<unknown>`, `readonly activeStack: readonly Token<unknown>[]`, and optional `readonly suggestions?: readonly string[]`.
  - `BindingConflictError` class carrying `readonly token: Token<unknown>`.
  - Resolution stack tracking (`activeStack`) in the resolver engine to detect cyclic dependencies before stack overflow.
  - Formatting of cycle trace strings (e.g. `Circular dependency detected: Token[A] -> Token[B] -> Token[C] -> Token[A]`).
  - Zero-dependency Levenshtein distance computation to find registered tokens with similar descriptions when a requested token is missing.
- **Non-goals**:
  - Asynchronous cycle detection or async stack propagation (owned by `async-resolution` in Phase 4).
  - External logging, telemetry, or error-reporting middleware integrations (deferred to Phase 7).

## Contract

```typescript
export class DockdiError extends Error {}

export class CircularDependencyError extends DockdiError {
  readonly cycle: readonly Token<unknown>[];
  constructor(cycle: readonly Token<unknown>[]);
}

export class MissingTokenError extends DockdiError {
  readonly token: Token<unknown>;
  readonly activeStack: readonly Token<unknown>[];
  readonly suggestions?: readonly string[];
  constructor(
    token: Token<unknown>,
    activeStack: readonly Token<unknown>[],
    suggestions?: readonly string[],
  );
}

export class BindingConflictError extends DockdiError {
  readonly token: Token<unknown>;
  constructor(token: Token<unknown>);
}
```

### Operational Guarantees

| Diagnostic Scenario | Error Thrown | Message Format & Features |
|---|---|---|
| Dependency cycle encountered (`A -> B -> A` or `A -> B -> C -> B`) | `CircularDependencyError` | `Circular dependency detected: Token[A] -> Token[B] -> Token[A]` |
| Token not found in container during `get()` | `MissingTokenError` | `Token not registered: Token[X]` + active stack path + `Did you mean: Token[Y]?` (if near-miss exists) |
| Token registered multiple times via `bind()` | `BindingConflictError` | `Token already bound: Token[X]` |

## Invariants

- **Stack overflow prevention**: Circular dependencies abort immediately upon detecting a duplicate token in `activeStack` before exceeding the runtime call stack limit (`Maximum call stack size exceeded`).
- **Zero production dependencies**: Levenshtein distance calculations and trace formatting are implemented purely with native TypeScript/ES2022 without external packages.
- **Complete cycle chain**: The `cycle` property in `CircularDependencyError` contains the exact slice of the resolution stack from the initial occurrence of the repeated token up to its second occurrence.
- **Unified error hierarchy**: All runtime errors thrown by dockdi inherit from `DockdiError` (`error instanceof DockdiError` evaluates to `true`).
- **Declaration isolation**: All error classes and properties specify explicit types compatible with `isolatedDeclarations: true`.

## Deferred / Open questions

- Asynchronous resolution stack tracking is deferred to Phase 4.

## Acceptance criteria

- Direct cycles (`A -> B -> A`) and indirect cycles (`A -> B -> C -> D -> B`) throw `CircularDependencyError` without overflowing the call stack.
- `error.cycle` contains the exact array of tokens forming the cycle.
- Unregistered tokens with descriptions similar to a registered token emit `MissingTokenError` containing `Did you mean: ...`.
- Re-binding an already registered token throws `BindingConflictError`.
- All custom error instances satisfy `instanceof DockdiError` and `instanceof Error`.
- Unit tests in `testing/diagnostics.test.ts` pass under `bun test` and `vitest run`.
- `bun run typecheck` and `bun run lint` pass with 0 errors.

---

Last updated: 2026-09-09.
