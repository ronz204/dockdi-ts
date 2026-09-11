# Diagnostics — Spec

> Error diagnostic infrastructure, circular dependency detection, and resolution path reporting.

## Intent

Provide a dedicated, zero-dependency diagnostic error hierarchy (`DockdiError`, `CircularDependencyError`, `MissingTokenError`, `BindingConflictError`, `InstantiationError`) that prevents call stack exhaustion on circular dependencies and prints complete resolution call paths.

## Scope

- **Owns**:
  - `DockdiError` base class extending standard JavaScript `Error`.
  - `CircularDependencyError` class carrying `readonly cycle: readonly Token<unknown>[]`.
  - `MissingTokenError` class carrying `readonly token: Token<unknown>` and `readonly path: readonly Token<unknown>[]`.
  - `BindingConflictError` class carrying `readonly token: Token<unknown>`.
  - `InstantiationError` class carrying `readonly token: Token<unknown>`, `readonly path: readonly Token<unknown>[]`, and `readonly cause: unknown`.
  - Resolution stack tracking (`stack`) in the synchronous resolver engine to detect cyclic dependencies before call stack overflow during `resolve()` executions.
  - Formatting of cycle trace strings (e.g. `Circular dependency detected: Token[A] -> Token[B] -> Token[C] -> Token[A]`).
- **Non-goals**:
  - External logging, telemetry, or error-reporting middleware integrations (deferred to Phase 6).

## Contract

```typescript
export class DockdiError extends Error {}

export class CircularDependencyError extends DockdiError {
  readonly cycle: readonly Token<unknown>[];
  constructor(cycle: readonly Token<unknown>[]);
}

export class MissingTokenError extends DockdiError {
  readonly token: Token<unknown>;
  readonly path: readonly Token<unknown>[];
  constructor(
    token: Token<unknown>,
    path: readonly Token<unknown>[],
  );
}

export class BindingConflictError extends DockdiError {
  readonly token: Token<unknown>;
  constructor(token: Token<unknown>);
}

export class InstantiationError extends DockdiError {
  readonly token: Token<unknown>;
  readonly path: readonly Token<unknown>[];
  readonly cause: unknown;
  constructor(
    token: Token<unknown>,
    path: readonly Token<unknown>[],
    cause: unknown,
  );
}
```

### Operational Guarantees

| Diagnostic Scenario | Error Thrown | Message Format & Features |
|---|---|---|
| Dependency cycle encountered (`A -> B -> A` or `A -> B -> C -> B`) | `CircularDependencyError` | `Circular dependency detected: Token[A] -> Token[B] -> Token[A]` |
| Token not found in container during `resolve()` | `MissingTokenError` | `Token not registered: Token[X]` + active stack resolution path |
| Token registered multiple times via `bind()` | `BindingConflictError` | `Token already bound: Token[X]` |
| Factory or constructor throws during instantiation | `InstantiationError` | `Failed to instantiate Token[X]: <cause>` + resolution path |

## Invariants

- **Stack overflow prevention**: Circular dependencies abort immediately upon detecting a duplicate token in resolution stack before exceeding the runtime call stack limit (`Maximum call stack size exceeded`).
- **Zero production dependencies**: Trace formatting and error diagnostics are implemented purely with native TypeScript/ES2022 without external packages.
- **Complete cycle chain**: The `cycle` property in `CircularDependencyError` contains the exact slice of the resolution stack from the initial occurrence of the repeated token up to its second occurrence.
- **Unified error hierarchy**: All runtime errors thrown by dockdi inherit from `DockdiError` (`error instanceof DockdiError` evaluates to `true`).
- **Declaration isolation**: All error classes and properties specify explicit types compatible with `isolatedDeclarations: true`.

## Deferred / Open questions
 
- None.

## Acceptance criteria

- Direct cycles (`A -> B -> A`) and indirect cycles (`A -> B -> C -> D -> B`) throw `CircularDependencyError` without overflowing the call stack.
- `error.cycle` contains the exact array of tokens forming the cycle.
- Resolving an unregistered token throws `MissingTokenError` containing the formatted resolution path.
- Re-binding an already registered token throws `BindingConflictError`.
- Instantiation failures wrap underlying errors into `InstantiationError`.
- All custom error instances satisfy `instanceof DockdiError` and `instanceof Error`.
- Unit tests pass under `bun test`.
- `bun x tsc --noEmit` passes with 0 errors.

---

Last updated: 2026-09-11.
