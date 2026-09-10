import type { Token } from "@core/token";
import type {
  Binding,
  ScopeType,
  BindingType,
  BindingBuilder,
  ScopedBindingBuilder,
} from "@core/binding";
import { BindingConflictError } from "@errors/catalog";
import type { Assembler, TokensForArgs } from "@core/assembler";

export class BindingRecord<T = unknown>
  implements Binding<T>, ScopedBindingBuilder
{
  public scope: ScopeType = "transient";

  constructor(
    public readonly type: BindingType,
    public readonly provider: unknown,
    public readonly dependencies?: readonly Token<unknown>[] | undefined,
  ) {}

  public inSingletonScope(): void {
    this.scope = "singleton";
  };

  public inTransientScope(): void {
    this.scope = "transient";
  };

  public inResolutionScope(): void {
    this.scope = "resolution";
  };
};

export class RegistryBuilder<T> implements BindingBuilder<T> {
  private readonly tokenKey: Token<unknown>;

  constructor(token: Token<T>,
    private readonly registry: Map<Token<unknown>, Binding<unknown>>) {

    this.tokenKey = token as Token<unknown>;
    if (this.registry.has(this.tokenKey)) {
      throw new BindingConflictError(this.tokenKey);
    };
  };

  public toValue(value: T): void {
    const binding = new BindingRecord("value", value);
    this.registry.set(this.tokenKey, binding);
  };

  public toClass<Args extends readonly unknown[]>(
    target: Assembler<T, Args>,
    tokens: TokensForArgs<Args>,
  ): ScopedBindingBuilder {
    return this.bindScoped("class", target, tokens);
  };

  public toFactory<Args extends readonly unknown[]>(
    factory: (...args: Args) => T | Promise<T>,
    tokens: TokensForArgs<Args>,
  ): ScopedBindingBuilder {
    return this.bindScoped("factory", factory, tokens);
  };

  private bindScoped<Args extends readonly unknown[]>(
    type: BindingType, provider: unknown, tokens: TokensForArgs<Args>,
  ): ScopedBindingBuilder {
    const binding = new BindingRecord(type, provider, tokens as readonly Token<unknown>[]);
    this.registry.set(this.tokenKey, binding);
    return binding;
  };
};
