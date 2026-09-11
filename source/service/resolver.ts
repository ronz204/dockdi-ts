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

export class Resolver {
  constructor(
    private readonly registry: Map<Token<unknown>, Binding<unknown>>,
    private readonly singletons: SingletonCache,
    private readonly parent?: Resolver | undefined,
  ) {}

  public resolve<T>(token: Token<T>): T {
    return this.visit(token, new Trace());
  }

  private visit<T>(token: Token<T>, trace: Trace): T {
    if (trace.stack.includes(token)) {
      throw new CircularDependencyError([
        ...trace.stack.slice(trace.stack.indexOf(token)),
        token,
      ]);
    }

    const owner = this.owner(token);
    if (!owner) throw new MissingTokenError(token, trace.stack);
    const binding = owner.registry.get(token) as Binding<unknown>;

    if (binding.type === "value") return binding.provider as T;

    const build = () => this.execute<T>(binding, token, trace);
    switch (binding.scope) {
      case "singleton":
        return this.singletons.remember(token, build);
      case "resolution":
        return trace.cache.remember(token, build);
      default:
        return build();
    }
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
    trace: Trace,
  ): T {
    trace.stack.push(token);
    try {
      const args = binding.deps?.map((dep) => this.visit(dep, trace)) ?? [];
      try {
        return binding.type === "class"
          ? new (binding.provider as Constructor<T, unknown[]>)(...args)
          : (binding.provider as (...args: unknown[]) => T)(...args);
      } catch (cause) {
        if (cause instanceof DockdiError) throw cause;
        throw new InstantiationError(token, trace.stack.slice(0, -1), cause);
      }
    } finally {
      trace.stack.pop();
    }
  }
}
