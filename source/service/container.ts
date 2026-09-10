import type { Binding, BindingBuilder } from "@core/binding";
import type { Token } from "@core/token";
import { RegistryBuilder } from "@service/builder";
import { SingletonStorage } from "@service/caching";
import { Resolver } from "@service/resolver";

export class Container {
  private readonly storage: SingletonStorage = new SingletonStorage();
  private readonly registry: Map<Token<unknown>, Binding<unknown>> = new Map();
  private readonly resolver: Resolver = new Resolver(
    this.registry,
    this.storage,
  );

  public bind<T>(token: Token<T>): BindingBuilder<T> {
    return new RegistryBuilder(token, this.registry);
  }

  public resolve<T>(token: Token<T>): Promise<T> {
    return this.resolver.resolve(token);
  }

  public reset(): void {
    this.storage.clear();
  }
}
