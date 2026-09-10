import type { Binding, BindingBuilder } from "@core/binding";
import type { Token } from "@core/token";
import { RegistryBuilder } from "@service/builder";
import { SingletonStorage } from "@service/caching";
import { Resolver } from "@service/resolver";

export class Container {
  private readonly storage: SingletonStorage = new SingletonStorage();
  private readonly registry: Map<Token<unknown>, Binding<unknown>> = new Map();
  private readonly overrides: Map<Token<unknown>, Binding<unknown>> = new Map();
  private readonly resolver: Resolver = new Resolver(
    this.registry,
    this.storage,
  );

  public bind<T>(token: Token<T>): BindingBuilder<T> {
    return new RegistryBuilder(token, this.registry);
  }

  public override<T>(token: Token<T>): BindingBuilder<T> {
    const tokenKey = token as Token<unknown>;
    const existing = this.registry.get(tokenKey);
    if (existing && !this.overrides.has(tokenKey)) {
      this.overrides.set(tokenKey, existing);
    }
    this.storage.invalidate(tokenKey);
    return new RegistryBuilder(token, this.registry, true);
  }

  public restore(token?: Token<unknown>): void {
    if (token) {
      const tokenKey = token as Token<unknown>;
      const original = this.overrides.get(tokenKey);
      if (original) {
        this.registry.set(tokenKey, original);
        this.overrides.delete(tokenKey);
      } else {
        this.registry.delete(tokenKey);
      }
      this.storage.invalidate(tokenKey);
      return;
    }

    for (const [key, original] of this.overrides) {
      this.registry.set(key, original);
      this.storage.invalidate(key);
    }
    this.overrides.clear();
  }

  public resolve<T>(token: Token<T>): Promise<T> {
    return this.resolver.resolve(token);
  }

  public reset(): void {
    this.storage.clear();
  }
}
