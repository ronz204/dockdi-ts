# DockDi

> **Type-first dependency injection for TypeScript.**  
> Zero decorators, zero `reflect-metadata`, zero runtime dependencies — checked directly by the compiler.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](./package.json)
[![TypeScript strict](https://img.shields.io/badge/TypeScript-strict-3178c6.svg)](./tsconfig.json)
[![Bundle size](https://img.shields.io/badge/bundle-<1KB-informational.svg)](./dist)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)](./testing)

---

## Why DockDi?

Most dependency injection libraries for TypeScript rely on `reflect-metadata` and legacy experimental decorators (`@inject()`, `@injectable()`). While popular, that approach introduces significant drawbacks for modern software development:

- **Fragile build configuration**: Requires `experimentalDecorators: true` and `emitDecoratorMetadata: true` in `tsconfig.json`. Modern bundlers (Vite, esbuild, SWC, Next.js / Turbopack, Bun) often struggle with or silently drop decorator metadata.
- **Runtime-only type safety**: Reflection inspects runtime types. If types are erased (interfaces, generics, unions) or if parameter decorators drift from constructor signatures, errors only surface at runtime when calling `resolve()`.
- **Heavy runtime bloat**: Polyfills like `reflect-metadata` monkey-patch global objects and add 30 KB+ to your production bundles.

**dockdi eliminates this entirely.** You declare a branded `Token<T>` for each dependency and pass the matching tokens tuple alongside the class or factory you register. The TypeScript compiler strictly verifies that the tokens match constructor arguments in **order, type, and count**.

---

## Feature Matrix vs Alternatives

| Capability | `dockdi` | InversifyJS | TSyringe | Awilix |
|---|:---:|:---:|:---:|:---:|
| **Constructor Type Safety** | 🛡️ **Compile-time (`tsc`)** | ❌ Runtime only | ❌ Runtime only | ❌ Runtime only |
| **`experimentalDecorators` needed** | 🚫 **No** | ⚠️ Required | ⚠️ Required | 🚫 No |
| **`emitDecoratorMetadata` needed** | 🚫 **No** | ⚠️ Required | ⚠️ Required | 🚫 No |
| **Runtime Polyfill (`reflect-metadata`)** | 🚫 **Zero** | ⚠️ Required (~30 KB) | ⚠️ Required | 🚫 Zero |
| **Bundler Compatibility** *(Vite, esbuild, Bun, SWC)* | ⚡ **100% Native** | ⚠️ Requires plugins/Babel | ⚠️ Requires plugins | ⚡ Native |
| **Minified Bundle Size** | 🪶 **< 1 KB** *(~440 B raw)* | 📦 ~35–50 KB | 📦 ~15 KB | 📦 ~10 KB |
| **Synchronous Resolution Overhead** | ⚡ **~37–99 ns** | 🐢 Microseconds | 🐢 Microseconds | 🐢 Microseconds |
| **Production Dependencies** | 🟢 **0** | 🟡 1+ | 🟡 1+ | 🟢 0 |

---

## The "Type-First" Guarantee in Action

With dockdi, **you cannot misconfigure a dependency graph without `tsc` stopping you immediately**:

```typescript
import { Container, token } from "dockdi";

interface Database { query(sql: string): unknown; }
interface Mailer { send(to: string, msg: string): void; }

class UserService {
  constructor(
    private readonly db: Database,
    private readonly mailer: Mailer,
  ) {}
}

const DatabaseToken = token<Database>("Database");
const MailerToken = token<Mailer>("Mailer");
const UserToken = token<UserService>("UserService");

const container = new Container();

// ✅ Compiles cleanly: tuple matches [Database, Mailer] exactly
container.bind(UserToken).toClass(UserService, [DatabaseToken, MailerToken]);

// ❌ COMPILE-TIME ERROR: Tokens passed in reverse order
// Argument of type '[Token<Mailer>, Token<Database>]' is not assignable to '[Token<Database>, Token<Mailer>]'.
// Type 'Token<Mailer>' is not assignable to type 'Token<Database>'.
container.bind(UserToken).toClass(UserService, [MailerToken, DatabaseToken]);

// ❌ COMPILE-TIME ERROR: Missing second constructor argument
// Expected 2 arguments in token tuple, but got 1.
container.bind(UserToken).toClass(UserService, [DatabaseToken]);
```

No more runtime surprises three layers deep in your microservice.

---

## Performance & Benchmarks

Because dockdi avoids reflection metadata inspection, AST parsing, and async microtask ticks, resolution executes in pure nanoseconds via native JavaScript `Map` lookups and direct constructor invocations.

Benchmarks measured using [`mitata`](https://github.com/evanwashere/mitata) on Bun (Intel Core i7-13620H):

| Scenario | Average Latency | p75 / p99 | Throughput |
|---|:---:|:---:|:---:|
| **Singleton resolution** *(warm cache)* | **37.23 ns/iter** | 33.98 ns / 251.90 ns | ~26.8 M ops/sec |
| **Transient resolution** *(instantiate on resolve)* | **99.44 ns/iter** | 88.35 ns / 383.30 ns | ~10.0 M ops/sec |
| **Resolution scope resolution** | **158.67 ns/iter** | 145.78 ns / 507.47 ns | ~6.3 M ops/sec |
| **Linear chain graph** *(depth 10)* | **1.44 µs/iter** | 1.61 µs / 1.92 µs | ~694 K ops/sec |
| **Linear chain graph** *(depth 50)* | **8.01 µs/iter** | 8.22 µs / 8.86 µs | ~125 K ops/sec |

---

## Installation

```sh
bun add dockdi
# or
npm install dockdi
# or
pnpm add dockdi
# or
yarn add dockdi
```

---

## Quick Start

```typescript
import { Container, token } from "dockdi";

// 1. Define contracts and implementations
interface Logger {
  log(message: string): void;
}

class ConsoleLogger implements Logger {
  log(message: string): void {
    console.log(`[LOG] ${message}`);
  }
}

class Greeter {
  constructor(private readonly logger: Logger) {}

  greet(name: string): void {
    this.logger.log(`Hello, ${name}!`);
  }
}

// 2. Create branded tokens
const LoggerToken = token<Logger>("Logger");
const GreeterToken = token<Greeter>("Greeter");

// 3. Register bindings in the container
const container = new Container();
container.bind(LoggerToken).toClass(ConsoleLogger);
container.bind(GreeterToken).toClass(Greeter, [LoggerToken]);

// 4. Resolve synchronously
const greeter = container.resolve(GreeterToken);
greeter.greet("world"); // "[LOG] Hello, world!"
```

---

## Real-World Pattern: Clean Architecture

Here is how a layered, production application wires configuration, repositories, domain services, and HTTP handlers:

```typescript
import { Container, token } from "dockdi";

// --- Ports / Interfaces ---
interface AppConfig {
  readonly dbUrl: string;
}

interface UserRepository {
  findById(id: string): { id: string; name: string } | null;
}

// --- Adapters / Implementations ---
class SqlUserRepository implements UserRepository {
  constructor(private readonly config: AppConfig) {}

  findById(id: string) {
    return { id, name: `User ${id} (via ${this.config.dbUrl})` };
  }
}

// --- Application Service ---
class UserService {
  constructor(private readonly repo: UserRepository) {}

  getUserDisplayName(id: string): string {
    const user = this.repo.findById(id);
    return user ? user.name.toUpperCase() : "ANONYMOUS";
  }
}

// --- Tokens ---
const ConfigToken = token<AppConfig>("Config");
const UserRepoToken = token<UserRepository>("UserRepository");
const UserServiceToken = token<UserService>("UserService");

// --- Composition Root ---
export function createAppContainer(config: AppConfig): Container {
  const container = new Container();

  // 1. Bind constant value
  container.bind(ConfigToken).toValue(config);

  // 2. Bind repository as singleton
  container.bind(UserRepoToken).toClass(SqlUserRepository, [ConfigToken]).inSingleton();

  // 3. Bind domain service
  container.bind(UserServiceToken).toClass(UserService, [UserRepoToken]);

  return container;
}

// --- Usage ---
const container = createAppContainer({ dbUrl: "postgresql://localhost:5432/app" });
const userService = container.resolve(UserServiceToken);
console.log(userService.getUserDisplayName("42"));
```

---

## Core Capabilities

### 1. Branded Tokens

A `Token<T>` is a unique symbol tagged with a phantom type `T`. It carries full compile-time type information with zero runtime payload.

```typescript
// Explicit type annotation
const CacheToken = token<CacheService>("CacheService");

// Inferred from class constructor directly
const NotificationToken = token(NotificationService);
```

### 2. Providers: Values, Classes, and Factories

Every token maps to exactly one provider:

```typescript
// Constant value (primitives, config objects, initialized clients)
container.bind(PortToken).toValue(8080);

// Class constructor with typed dependency tuple
container.bind(ServiceToken).toClass(OrderService, [DbToken, EventBusToken]);

// Dynamic factory function with dependencies
container.bind(SessionToken).toFactory(
  (config, req) => new Session(config.timeout, req.sessionId),
  [ConfigToken, RequestToken]
);
```

> **Note**: Binding the same token twice throws `BindingConflictError`. Registration is intended to happen once at your composition root.

### 3. Lifecycle Scopes

Control instance lifetimes using `.inTransient()`, `.inSingleton()`, or `.inResolution()`:

| Scope | Method | Behavior |
|---|---|---|
| **Transient** | Default / `.inTransient()` | A new instance is created on every `resolve()` call. |
| **Singleton** | `.inSingleton()` | Exactly one instance cached for the lifetime of the container. |
| **Resolution** | `.inResolution()` | Shared within a single top-level `resolve()` call graph (ideal for diamond dependencies). |

```typescript
container.bind(DatabaseToken).toClass(PostgresDatabase).inSingleton();
container.bind(RequestIdToken).toFactory(() => crypto.randomUUID()).inResolution();
```

### 4. Child Containers & Request Scoping

`container.scope()` creates a child container that inherits all registrations from its parent, while isolating local bindings and instances.

This is the canonical pattern for per-request contexts in HTTP frameworks (Express, Fastify, Hono, Elysia):

```typescript
// Root container setup
const rootContainer = new Container();
rootContainer.bind(DatabaseToken).toClass(PostgresDatabase).inSingleton();
rootContainer.bind(OrderServiceToken).toClass(OrderService, [DatabaseToken, RequestContextToken]);

// Per-request HTTP handler
function handleHttpRequest(req: Request) {
  // Create an isolated child scope
  const requestContainer = rootContainer.scope();

  // Bind request-specific contextual value
  requestContainer.bind(RequestContextToken).toValue({
    requestId: req.headers.get("x-request-id") ?? crypto.randomUUID(),
    clientIp: req.headers.get("x-forwarded-for") ?? "127.0.0.1",
  });

  // Resolves OrderService using parent's DB singleton + child's RequestContext
  const orderService = requestContainer.resolve(OrderServiceToken);
  return orderService.process();
}
```

### 5. Testing Overrides Without Container Mutation

Testing components with mocks is effortless. Use `container.override()` on a child scope to stub dependencies without polluting or recreating the production container:

```typescript
import { test, expect } from "vitest";

test("OrderService handles failed payments", () => {
  // 1. Create an isolated test scope
  const testContainer = productionContainer.scope();

  // 2. Replace payment gateway with a mock
  testContainer.override(PaymentGatewayToken).toValue({
    charge: () => ({ success: false, error: "INSUFFICIENT_FUNDS" }),
  });

  // 3. Resolve and test
  const orderService = testContainer.resolve(OrderServiceToken);
  const result = orderService.checkout({ total: 100 });

  expect(result.status).toBe("FAILED");
});
```

> **Cache Isolation**: dockdi's resolution engine features smart singleton isolation. Overriding a dependency inside a child scope automatically prevents parent singletons from leaking contaminated state to sibling scopes.

### 6. Modular Composition (`container.load`)

Organize application modules into modular configuration functions:

```typescript
import { type Module, Container } from "dockdi";

const databaseModule: Module = (c) => {
  c.bind(DbPoolToken).toClass(PostgresPool).inSingleton();
  c.bind(UserRepositoryToken).toClass(SqlUserRepository, [DbPoolToken]);
};

const billingModule: Module = (c) => {
  c.bind(StripeClientToken).toClass(StripeClient).inSingleton();
  c.bind(PaymentServiceToken).toClass(PaymentService, [StripeClientToken]);
};

// Fluent module loading
const container = new Container().load(databaseModule, billingModule);
```

### 7. Explicit Resource Management & Disposal

`container.reset()` clears cached singletons. If any cached instance implements `[Symbol.dispose]()` (TypeScript 5.2+ Explicit Resource Management) or a `.dispose()` method, dockdi invokes it automatically:

```typescript
class DatabaseConnection {
  [Symbol.dispose]() {
    console.log("Closing connection pool...");
  }
}

container.bind(DbToken).toClass(DatabaseConnection).inSingleton();
container.resolve(DbToken);

// Cleans up all cached singletons and executes their disposal hooks
container.reset(); // Prints: "Closing connection pool..."
```

---

## Clear Diagnostic Errors

When something goes wrong, dockdi fails immediately with actionable diagnostic messages:

| Error Class | Trigger Scenario | Formatted Message Preview |
|---|---|---|
| `CircularDependencyError` | A cycle is detected (`A -> B -> C -> A`) before the call stack overflows. | `Circular dependency detected: Token[A] -> Token[B] -> Token[C] -> Token[A]` |
| `MissingTokenError` | Attempting to resolve a token that was never bound. | `Token not registered: Token[Mailer]` with indented resolution path |
| `BindingConflictError` | Binding an already-registered token via `.bind()`. | `Token already bound: Token[Database]` |
| `InstantiationError` | A constructor or factory throws during resolution. | `Failed to instantiate Token[Server]: <cause>` |

### Example Diagnostic Traces

```text
MissingTokenError: Token not registered: Token[Database]
Resolution path:
Token[AppController]
  └─> Token[UserService]
    └─> Token[Database] (FAILED)
```

```text
CircularDependencyError: Circular dependency detected: Token[ServiceA] -> Token[ServiceB] -> Token[ServiceA]
```

---

## API Reference Cheatsheet

```typescript
// Creation
token<T>(description?: string): Token<T>
token<T>(target: Class<T>): Token<T>

// Container instance
const container = new Container();

// Registration
container.bind(Token).toValue(value);
container.bind(Token).toClass(Constructor, [depTokens...]);
container.bind(Token).toFactory(factoryFn, [depTokens...]);

// Scoping (chained after toClass or toFactory)
.inTransient()   // Default: new instance per resolve
.inSingleton()   // Single instance for container lifetime
.inResolution()  // Shared within single resolve() call tree

// Resolution & Inspection
container.resolve(Token): T
container.has(Token): boolean

// Hierarchies & Testing
container.scope(): Container
container.override(Token).toValue(mockValue)
container.load(...modules: Module[]): this
container.reset(): void // Purges singletons & calls dispose hooks
```

---

## Architectural Decisions & FAQ

### Why is resolution strictly synchronous?
Asynchronous initialization (e.g., awaiting database connection pools, fetching secrets from AWS Vault, or reading configuration files) belongs in your application's **bootstrap phase** before starting your services. 

Once your async bootstrap completes, pass the initialized instances into the container via `.toValue(dbConnection)`. This avoids:
1. "Function coloring" (`async`/`await` poisoning every constructor and method).
2. Unnecessary event loop microtask overhead on dependency resolution.
3. Complex race conditions during concurrent resolutions.

### Why not use TypeScript decorators?
TypeScript legacy decorators (`experimentalDecorators`) rely on the `reflect-metadata` prototype polyfill, which:
- Fails or requires custom plugins in modern bundlers like Vite, Bun, esbuild, and SWC.
- Adds runtime overhead and extra bundle weight (~30 KB+).
- Cannot express complex generic interfaces or union types.

By contrast, `dockdi`'s branded tokens work in **100% standard TypeScript**, with zero compiler flags and zero runtime overhead.

### Can I use class constructors directly as tokens?
Yes! If you don't want to define custom string descriptions, pass the class directly to `token`:
```typescript
const UserServiceToken = token(UserService);
```

---

## Runnable Samples

The [`samples/`](./samples) directory contains runnable, self-contained examples for every feature:

```sh
bun run samples/01-basic-binding.ts
```

| Sample File | Demonstrates |
|---|---|
| [`01-basic-binding.ts`](./samples/01-basic-binding.ts) | Constant values, class instantiation, and factory providers |
| [`02-lifecycle-scopes.ts`](./samples/02-lifecycle-scopes.ts) | Transient, singleton, and resolution scopes in diamond graphs |
| [`03-child-containers.ts`](./samples/03-child-containers.ts) | `container.scope()` for hierarchical per-request contexts |
| [`04-testing-mocks.ts`](./samples/04-testing-mocks.ts) | `container.override()` for isolated unit and integration testing |
| [`05-module-loading.ts`](./samples/05-module-loading.ts) | Grouping dependencies with `Module` and `container.load()` |
| [`06-error-handling.ts`](./samples/06-error-handling.ts) | Diagnostics for cycles, missing tokens, and conflicts |
| [`07-advanced-types.ts`](./samples/07-advanced-types.ts) | Custom helper abstractions built on dockdi's exported types |

---

## Development

```sh
bun install         # Install dependencies
bun run typecheck   # Type-check the whole project (strict)
bun run test        # Run unit and integration tests (vitest)
bun run build       # Compile dual ESM and CJS bundle (dist/)
bun run build:watch # Rebuild on file changes
bun run lint        # Run biome linter
bun run verify      # typecheck + lint + test in one pass
```

### Releasing

Releases are automated with [Changesets](https://github.com/changesets/changesets) and publish to npm via [Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) (OIDC) — no npm token is stored in this repo.

1. On any change that should ship a new version, add a changeset describing it: `bunx changeset`.
2. Commit the generated `.changeset/*.md` file alongside your change and open a PR as usual.
3. Once merged to `main`, CI opens or updates a "Version Packages" PR that aggregates all pending changesets into a version bump and changelog entry.
4. Merging that PR triggers the actual `npm publish`.

A change that doesn't warrant a release (docs, internal tooling) can skip the changeset entirely — CI only versions and publishes when one is present.

---

## License

[MIT](./LICENSE) © ronz
