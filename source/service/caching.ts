import type { Token } from "@core/token";

export class SingletonStorage {
  private readonly instances: Map<Token<unknown>, unknown> = new Map();
  private readonly inFlight: Map<Token<unknown>, Promise<unknown>> = new Map();

  public async remember<T>(
    token: Token<T>,
    producer: () => Promise<T>,
  ): Promise<T> {
    const tokenKey = token as Token<unknown>;

    if (this.instances.has(tokenKey)) {
      return this.instances.get(tokenKey) as T;
    }

    if (this.inFlight.has(tokenKey)) {
      return this.inFlight.get(tokenKey) as Promise<T>;
    }

    const task = (async (): Promise<T> => {
      try {
        const instance = await producer();
        this.instances.set(tokenKey, instance);
        return instance;
      } finally {
        this.inFlight.delete(tokenKey);
      }
    })();

    this.inFlight.set(tokenKey, task);
    return task;
  }

  public clear(): void {
    this.instances.clear();
    this.inFlight.clear();
  }
}

export class ResolutionStorage {
  private readonly instances: Map<Token<unknown>, Promise<unknown>> = new Map();

  public remember<T>(token: Token<T>, producer: () => Promise<T>): Promise<T> {
    const tokenKey = token as Token<unknown>;

    if (this.instances.has(tokenKey)) {
      return this.instances.get(tokenKey) as Promise<T>;
    }

    const task = producer();
    this.instances.set(tokenKey, task);
    return task;
  }
}
