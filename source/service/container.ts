import type { Binding, BindingBuilder } from "@core/binding";
import type { Token } from "@core/token";
import { MissingTokenError } from "@errors/catalog";
import { RegistryBuilder } from "@service/builder";
import { SingletonCache } from "@service/caching";
import { Resolver } from "@service/resolver";

export type Module = (container: Container) => void;

export class Container {
  private readonly cache: SingletonCache = new SingletonCache();
  private readonly registry: Map<Token<unknown>, Binding<unknown>> = new Map();
  private readonly resolver: Resolver;

  constructor(private readonly parent?: Container | undefined) {
    this.resolver = new Resolver(
      this.registry,
      this.cache,
      this.parent?.resolver,
    );
  }

  public bind<T>(token: Token<T>): BindingBuilder<T> {
    return new RegistryBuilder(token, this.registry);
  }

  public override<T>(token: Token<T>): BindingBuilder<T> {
    if (!this.has(token)) {
      throw new MissingTokenError(token, []);
    }
    this.cache.delete(token);
    return new RegistryBuilder(token, this.registry, true);
  }

  public has(token: Token<unknown>): boolean {
    return (
      this.registry.has(token as Token<unknown>) ||
      (this.parent?.has(token) ?? false)
    );
  }

  public resolve<T>(token: Token<T>): T {
    return this.resolver.resolve(token);
  }

  public scope(): Container {
    return new Container(this);
  }

  public load(...modules: readonly Module[]): this {
    for (const module of modules) {
      module(this);
    }
    return this;
  }

  public reset(): void {
    this.cache.clear();
  }
}
