import type { Binding, BindingBuilder } from "./binding";
import { createBindingBuilder } from "./builder";
import { resolveToken, resolveTokenAsync } from "./resolver";
import type { Token } from "./token";

export class Container {
  private readonly registry = new Map<Token<unknown>, Binding<unknown>>();
  private readonly singletonCache = new Map<Token<unknown>, unknown>();
  private readonly asyncSingletonCache = new Map<
    Token<unknown>,
    Promise<unknown>
  >();

  bind<T>(token: Token<T>): BindingBuilder<T> {
    return createBindingBuilder(token, this.registry);
  }

  get<T>(token: Token<T>): T {
    return resolveToken(token, this.registry, this.singletonCache, new Map());
  }

  resolveAsync<T>(token: Token<T>): Promise<T> {
    return resolveTokenAsync(
      token,
      this.registry,
      this.singletonCache,
      this.asyncSingletonCache,
      new Map(),
    );
  }

  reset(): void {
    this.singletonCache.clear();
    this.asyncSingletonCache.clear();
  }
}
