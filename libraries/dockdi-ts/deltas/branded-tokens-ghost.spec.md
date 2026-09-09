# Token — Spec

> Unique branded token type and creator function carrying compile-time type information for reflection-free dependency injection.

## Intent

Provide a type-safe, reflection-free identifier mechanism to bind and resolve dependencies in TypeScript without runtime decorators (`@inject`) or `reflect-metadata`. Tokens attach a phantom type tag to native `Symbol` primitives to enable compile-time type checking while incurring zero runtime memory overhead and zero external dependencies.

## Scope

- **Owns**:
  - Phantom brand declaration (`unique symbol`) stripped at compile time with zero runtime emit.
  - `Token<T>` branded type parameterized over the dependency contract `T`.
  - `token<T>(description?: string): Token<T>` factory function.
  - Compile-time type isolation between incompatible tokens and safe covariance for subtypes.
- **Non-goals**:
  - Runtime reflection, token serialization, or metadata storage attached to tokens.
  - Ambient global token registries (e.g. `Symbol.for`). Every token is a distinct reference created via `Symbol(description)`.
  - Runtime validation of resolved types against tokens (type safety is enforced statically by TypeScript).

## Contract

```typescript
declare const __brand: unique symbol;

export type Token<T> = symbol & {
  readonly [__brand]: T;
};

export function token<T>(description?: string): Token<T>;
```

### Operational Guarantees

| Invocations | Return Type | Runtime Type | Identity / Behavior |
|---|---|---|---|
| `token<T>("name")` | `Token<T>` | `symbol` | `description === "name"`, referentially unique (`token("a") !== token("a")`) |
| `token<T>()` | `Token<T>` | `symbol` | `description === undefined`, referentially unique |

Tokens are native primitives and can serve directly as keys in `Map<Token<unknown>, unknown>` or elements in `Set<Token<unknown>>`.

## Invariants

- **Zero runtime footprint**: The phantom brand `__brand` is declared with `declare const` and never emitted to runtime JavaScript. `typeof token() === "symbol"` always holds.
- **Static type isolation**: Two tokens with incompatible types (e.g. `Token<string>` and `Token<number>`) are mutually non-assignable at compile time.
- **Safe subtype covariance**: If `Sub` extends `Base`, `Token<Sub>` is assignable to `Token<Base>`, but `Token<Base>` is not assignable to `Token<Sub>`.
- **Declaration isolation**: The factory function explicitly specifies its return type (`Token<T>`), satisfying TypeScript's `isolatedDeclarations: true`.
- **Zero production dependencies**: The token module depends exclusively on TypeScript and ECMAScript built-in primitives (`Symbol`).

## Deferred / Open questions

- None. The branded token design is fully settled and verified.

## Acceptance criteria

- Unit tests in `testing/token.test.ts` pass under `bun test` and `vitest run`.
- Static assertions verify that incompatible primitive and structural types cannot be assigned across tokens.
- Static assertions verify covariance for subtype hierarchies.
- `bun run typecheck` (`tsc --noEmit`) passes with zero errors under strict checks and `isolatedDeclarations: true`.
- `bun run build` (`bunup`) successfully emits dual ESM/CJS bundles and declaration files containing the branded token definition.

---

Last updated: 2026-09-09.
