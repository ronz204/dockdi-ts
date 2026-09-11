import type { Binding, BindingBuilder } from "@core/binding";
import type { Token } from "@core/token";
import { RegistryBuilder } from "@service/builder";
import { SingletonCache } from "@service/caching";
import { Resolver } from "@service/resolver";

export type Module = (container: Container) => void;

export class Container {
  private readonly cache = new SingletonCache();
  private readonly registry = new Map<Token<unknown>, Binding<unknown>>();
  private readonly resolver = new Resolver(this.registry, this.cache);

  public bind<T>(token: Token<T>): BindingBuilder<T> {
    return new RegistryBuilder(token, this.registry);
  }

  public has(token: Token<unknown>): boolean {
    return this.registry.has(token as Token<unknown>);
  }

  public get<T>(token: Token<T>): T {
    return this.resolver.resolve(token);
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
