import type { Token } from "@core/token";

export class SingletonStorage {
  private readonly instances: Map<Token<unknown>, unknown> = new Map();

  public remember<T>(token: Token<T>, producer: () => T): T {
    const tokenKey = token as Token<unknown>;

    if (this.instances.has(tokenKey)) {
      return this.instances.get(tokenKey) as T;
    }

    const instance = producer();
    this.instances.set(tokenKey, instance);
    return instance;
  }

  public invalidate(token: Token<unknown>): void {
    const tokenKey = token as Token<unknown>;
    this.instances.delete(tokenKey);
  }

  public clear(): void {
    this.instances.clear();
  }
}

export class ResolutionStorage {
  private readonly instances: Map<Token<unknown>, unknown> = new Map();

  public remember<T>(token: Token<T>, producer: () => T): T {
    const tokenKey = token as Token<unknown>;

    if (this.instances.has(tokenKey)) {
      return this.instances.get(tokenKey) as T;
    }

    const instance = producer();
    this.instances.set(tokenKey, instance);
    return instance;
  }
}
