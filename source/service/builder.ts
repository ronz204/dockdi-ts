import type { Constructor, TokensArg } from "@core/assembler";
import type {
  Binding,
  BindingBuilder,
  BindingType,
  ScopeBuilder,
  ScopeType,
} from "@core/binding";
import type { Token } from "@core/token";
import { BindingConflictError } from "@errors/catalog";

class BindingRecord<T = unknown> implements Binding<T>, ScopeBuilder {
  public scope: ScopeType = "transient";

  constructor(
    public readonly type: BindingType,
    public readonly provider: unknown,
    public readonly deps?: readonly Token<unknown>[],
  ) {}

  public inSingleton(): void {
    this.scope = "singleton";
  }

  public inTransient(): void {
    this.scope = "transient";
  }

  public inResolution(): void {
    this.scope = "resolution";
  }
}

export class RegistryBuilder<T> implements BindingBuilder<T> {
  private readonly key: Token<unknown>;

  constructor(
    token: Token<T>,
    private readonly registry: Map<Token<unknown>, Binding<unknown>>,
  ) {
    this.key = token as Token<unknown>;
    if (this.registry.has(this.key)) {
      throw new BindingConflictError(this.key);
    }
  }

  public toValue(value: T): void {
    const binding = new BindingRecord("value", value);
    this.registry.set(this.key, binding);
  }

  public toClass<Args extends readonly unknown[]>(
    target: Constructor<T, Args>,
    ...[tokens]: TokensArg<Args>
  ): ScopeBuilder {
    return this.bindScoped("class", target, tokens);
  }

  public toFactory<Args extends readonly unknown[]>(
    factory: (...args: Args) => T,
    ...[tokens]: TokensArg<Args>
  ): ScopeBuilder {
    return this.bindScoped("factory", factory, tokens);
  }

  private bindScoped(
    type: BindingType,
    provider: unknown,
    tokens?: readonly Token<unknown>[],
  ): ScopeBuilder {
    const binding = new BindingRecord(type, provider, tokens ?? []);
    this.registry.set(this.key, binding);
    return binding;
  }
}
