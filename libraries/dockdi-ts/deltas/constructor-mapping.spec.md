# Constructor Mapping — Spec

> Type-level mapping and verification linking class constructor parameters to ordered tuples of branded injection tokens.

## Intent

Eliminate the positional fragility and silent runtime injection errors common to reflection-free dependency injection containers (the "Brandi gap"). TypeScript's static type system must enforce at compile time that an ordered list of injection tokens passed for class instantiation exactly mirrors the quantity, order, and assigned types of the class constructor parameters, requiring zero runtime decorators or reflection metadata.

## Scope

- **Owns**:
  - `Constructor<T, Args>` abstraction capturing instantiable class prototypes.
  - `TokensForArgs<Args>` type-level mapped tuple transforming constructor parameter types `[A, B, ...]` into matching token tuples `[Token<A>, Token<B>, ...]`.
  - Compile-time verification ensuring exact arity, exact sequence, and type compatibility between tokens and constructor arguments.
  - Minimal synchronous instantiation helper (`instantiate<T, Args>(target: Constructor<T, Args>, tokens: TokensForArgs<Args>, resolve: (token: Token<unknown>) => unknown): T`) to validate executable mechanics in Phase 0.
- **Non-goals**:
  - Container lifecycle caching or scope resolution (owned by `container-registry` and `lifecycle-scopes`).
  - Circular dependency detection across recursive resolution trees (owned by `error-diagnostics`).
  - Property injection or method injection (dockdi strictly constrains dependency resolution to constructor and factory arguments).
  - Runtime decorator inspection, AST parsing, or bytecode decompilation of constructor parameters.

## Contract

```typescript
export type Constructor<T = unknown, Args extends readonly unknown[] = readonly unknown[]> =
  new (...args: Args) => T;

export type TokensForArgs<Args extends readonly unknown[]> = {
  readonly [K in keyof Args]: Token<Args[K]>;
};

export type TokenResolver = <T>(token: Token<T>) => T;

export function instantiate<T, Args extends readonly unknown[]>(
  target: Constructor<T, Args>,
  tokens: TokensForArgs<Args>,
  resolve: TokenResolver
): T;
```

### Operational Guarantees

| Scenario | Compiler Behavior | Runtime Behavior |
|---|---|---|
| Exact token sequence matches constructor parameters | Accepted | Invokes `new target(...args)` where each arg is resolved from the corresponding token in order |
| Token types swapped (e.g. `[Token<B>, Token<A>]` for `(a: A, b: B)`) | Compile error on mismatched tuple indices | Not allowed to compile |
| Insufficient tokens (tuple length < constructor parameter count) | Compile error (`Source has X element(s) but target requires Y`) | Not allowed to compile |
| Excess tokens (tuple length > constructor parameter count) | Compile error (Type mismatch on index or excess elements) | Not allowed to compile |
| Subtype token for base parameter (e.g. `Token<AdminUser>` for `User`) | Accepted due to token covariance | Resolves subtype instance satisfying base parameter |

## Invariants

- **Brandi gap closure**: Any divergence between a constructor's parameter list and its associated token tuple must fail compilation immediately. No parameter drift can pass unnoticed to runtime.
- **Zero decorator / zero reflection**: Association relies purely on type-level tuple mapping (`TokensForArgs`). No `@inject` decorators, experimental flags, or `reflect-metadata` imports are permitted.
- **Preservation of execution order**: In the instantiation helper, tokens are resolved synchronously in the exact index sequence `0, 1, ..., n - 1` matching constructor parameters.
- **Zero production dependencies**: The mapping and instantiation mechanics rely solely on TypeScript type constructs and standard ECMAScript array mapping / `new` operator.
- **Isolated declarations compliance**: All exported utility types and instantiation functions provide explicit type annotations compatible with `isolatedDeclarations: true`.

## Deferred / Open questions

- Standalone declaration helpers (such as `injected(Class, tokens)` producing reusable descriptor objects) are deferred to future evaluation if downstream composition patterns require declaring bindings outside `Container.bind`. Option A (direct tuple in binding/instantiation) satisfies all Phase 0 and Phase 1 needs.

## Acceptance criteria

- Unit and type tests in `testing/constructor-mapping.test.ts` pass under `bun test` and `vitest run`.
- TypeScript rejects any call to `instantiate` where tokens are swapped, missing, or of incompatible types.
- A class with no constructor arguments accepts an empty tuple `[]` without error.
- A class with multiple dependencies instantiates successfully with resolved instances injected into constructor arguments in proper order.
- `bun run typecheck` (`tsc --noEmit`) passes with zero errors under strict settings and `isolatedDeclarations: true`.

---

Last updated: 2026-09-09.
