import type { Constructor } from "@core/assembler";
import type { Binding } from "@core/binding";
import type { Token } from "@core/token";
import {
  CircularDependencyError,
  DockdiError,
  InstantiationError,
  MissingTokenError,
} from "@errors/catalog";
import { ResolutionCache, type SingletonCache } from "./caching";

class Trace {
  public readonly stack: Token<unknown>[] = [];
  public readonly cache: ResolutionCache = new ResolutionCache();
}

interface Resolved<T> {
  value: T;
  shared: boolean;
}

export class Resolver {
  constructor(
    private readonly registry: Map<Token<unknown>, Binding<unknown>>,
    private readonly singletons: SingletonCache,
    private readonly parent?: Resolver | undefined,
  ) {}

  public resolve<T>(token: Token<T>): T {
    return this.visit(token, new Trace()).value;
  }

  private visit<T>(token: Token<T>, trace: Trace): Resolved<T> {
    if (trace.stack.includes(token)) {
      throw new CircularDependencyError([
        ...trace.stack.slice(trace.stack.indexOf(token)),
        token,
      ]);
    }

    const owner = this.owner(token);
    if (!owner) throw new MissingTokenError(token, trace.stack);
    const binding = owner.registry.get(token) as Binding<unknown>;

    if (binding.type === "value") {
      return { value: binding.provider as T, shared: true };
    }

    if (binding.scope === "resolution") {
      return trace.cache.remember(token as Token<Resolved<T>>, () =>
        this.execute<T>(binding, token, owner, trace),
      );
    }

    if (binding.scope !== "singleton") {
      return this.execute<T>(binding, token, owner, trace);
    }

    if (owner !== this && this.singletons.has(token)) {
      return { value: this.singletons.get(token), shared: false };
    }
    if (owner.singletons.has(token)) {
      return { value: owner.singletons.get(token), shared: true };
    }

    const built = this.execute<T>(binding, token, owner, trace);
    const cache = built.shared ? owner.singletons : this.singletons;
    return {
      value: cache.remember(token, () => built.value),
      shared: built.shared,
    };
  }

  private owner(token: Token<unknown>): Resolver | undefined {
    let resolver: Resolver | undefined = this;
    while (resolver && !resolver.registry.has(token)) {
      resolver = resolver.parent;
    }
    return resolver;
  }

  private execute<T>(
    binding: Binding<unknown>,
    token: Token<unknown>,
    owner: Resolver,
    trace: Trace,
  ): Resolved<T> {
    trace.stack.push(token);
    try {
      const { values, shared } = this.gather(binding, owner, trace);
      const value = this.instantiate<T>(binding, values, token, trace);
      return { value, shared };
    } finally {
      trace.stack.pop();
    }
  }

  private gather(
    binding: Binding<unknown>,
    owner: Resolver,
    trace: Trace,
  ): { values: unknown[]; shared: boolean } {
    const resolved = (binding.deps ?? []).map((dep) => ({
      dep, ...this.visit(dep, trace),
    }));

    return {
      values: resolved.map((r) => r.value),
      shared: resolved.every(
        (r) => r.shared && owner.owner(r.dep) === this.owner(r.dep),
      ),
    };
  }

  private instantiate<T>(
    binding: Binding<unknown>,
    args: unknown[],
    token: Token<unknown>,
    trace: Trace,
  ): T {
    try {
      return binding.type === "class"
        ? new (binding.provider as Constructor<T, unknown[]>)(...args)
        : (binding.provider as (...args: unknown[]) => T)(...args);
    } catch (cause) {
      if (cause instanceof DockdiError) throw cause;
      throw new InstantiationError(token, trace.stack.slice(0, -1), cause);
    }
  }
}
