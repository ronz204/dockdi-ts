import type { Binding, BindingBuilder } from "@core/binding";
import type { Token } from "@core/token";
import { RegistryBuilder } from "@service/builder";
import { resolveToken } from "@service/resolver";

export class Container {
  private readonly registry: Map<Token<unknown>, Binding<unknown>> = new Map();

  public bind<T>(token: Token<T>): BindingBuilder<T> {
    return new RegistryBuilder(token, this.registry);
  }

  public resolve<T>(token: Token<T>): Promise<T> {
    return resolveToken(token, this.registry);
  }
}
