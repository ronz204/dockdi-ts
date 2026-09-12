# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-09-12

Initial stable release of **dockdi**, a type-first dependency injection library for TypeScript based on explicit branded tokens with zero decorators, zero `reflect-metadata`, and zero runtime dependencies.

### Added

#### Type System & Branded Tokens
- Branded token factory `token<T>(description?)` producing unique `Token<T>` symbols tagged with a phantom type `T` to carry compile-time type information with zero runtime overhead.
- Class constructor overload `token(MyClass)` allowing classes to serve as their own token identifier without manual string descriptions.
- `TokensArg<Args>` and `Tokens<Args>` type helpers enforcing exact tuple type, order, and count matching between constructor/factory parameters and injected tokens at compile time (`tsc`).
- Support for zero-argument constructors and factories allowing the token tuple argument to be omitted entirely.

#### Container & Resolution Engine
- Strictly synchronous resolution engine via `container.resolve(token): T`, returning dependencies directly with zero microtask/promise overhead.
- Native `Map`-backed container registry with constant-time lookup and sub-microsecond resolution (~37 ns for warm singletons, ~99 ns for transient).
- Three binding providers:
  - `.toValue(value)` for constant values, configuration records, and pre-initialized clients.
  - `.toClass(Constructor, tokens)` for class instantiation via constructor injection.
  - `.toFactory(factoryFn, tokens)` for dynamic or functional instantiation.
- `container.has(token)` to inspect token registration across local and inherited container scopes.

#### Lifecycle Scopes & Resource Management
- Three lifecycle scoping policies:
  - `transient` (default): instantiates a fresh instance on every resolution call.
  - `.inSingleton()`: caches and shares a single instance for the entire lifetime of the container.
  - `.inResolution()`: memoizes and shares an instance across a single top-level `resolve()` graph traversal (resolves diamond dependencies cleanly).
- Explicit Resource Management support: `container.reset()` clears cached singletons and automatically executes `[Symbol.dispose]()` (TypeScript 5.2+) or `.dispose()` on evicted instances.

#### Hierarchical Containers & Testing Overrides
- Child container scoping via `container.scope()`, inheriting parent bindings while maintaining an isolated local registry and instance cache.
- `container.override(token)` for testing doubles and mocks, immediately evicting affected cached singletons.
- Inherited cache taint isolation: overriding a dependency in a child scope prevents parent singletons from leaking contaminated state into sibling scopes.
- Modular composition through `Module` functions (`(container: Container) => void`) and fluent chaining via `container.load(...modules)`.

#### Diagnostics & Error Handling
- Unified diagnostic error hierarchy inheriting from `DockdiError` and native `Error`:
  - `CircularDependencyError`: detects cyclic dependencies (`A -> B -> C -> A`) during synchronous graph traversal and aborts before overflowing the runtime call stack.
  - `MissingTokenError`: raised when resolving unregistered tokens, printing the complete indented resolution path (`Token[A] └─> Token[B] (FAILED)`).
  - `BindingConflictError`: prevents silent registration overwrites when calling `.bind()` on an already-registered token.
  - `InstantiationError`: wraps exceptions thrown inside constructors or factories during resolution, preserving the underlying `cause` and resolution path.

#### Distribution & Documentation
- Dual ESM and CommonJS bundle generation via `bunup` with matching `.d.ts` and `.d.cts` declaration maps.
- Strict zero runtime production dependencies (`"dependencies": {}`).
- Production bundle size under 1 KB minified (~443 bytes raw ESM, ~344 bytes gzip).
- Seven executable, self-contained examples in `samples/` covering basic bindings, scopes, child scopes, testing overrides, modules, error diagnostics, and advanced types.
- Complete test suite comprising 66 unit and integration tests across 14 suites with 100% pass rate.
- Microbenchmarks suite powered by `mitata` measuring latency across transient, singleton, resolution, and deep chain graph resolutions.

[Unreleased]: https://github.com/ronz204/dockdi-ts/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/ronz204/dockdi-ts/releases/tag/v1.0.0
