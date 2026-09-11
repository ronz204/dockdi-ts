import type { Token } from "@core/token";

function dispose(target: unknown): void {
  if (target && typeof target === "object") {
    const fn =
      ("dispose" in Symbol &&
        (target as Record<symbol, unknown>)[Symbol.dispose]) ||
      (target as Record<string, unknown>).dispose;
    if (typeof fn === "function") {
      (fn as () => void).call(target);
    }
  }
}

export class InstanceCache {
  protected readonly instances: Map<Token<unknown>, unknown> = new Map();

  public has(token: Token<unknown>): boolean {
    return this.instances.has(token as Token<unknown>);
  }

  public get<T>(token: Token<T>): T {
    return this.instances.get(token as Token<unknown>) as T;
  }

  public remember<T>(token: Token<T>, create: () => T): T {
    const key = token as Token<unknown>;
    let instance = this.instances.get(key);
    if (instance === undefined && !this.instances.has(key)) {
      instance = create();
      this.instances.set(key, instance);
    }
    return instance as T;
  }

  public delete(token: Token<unknown>): void {
    const key = token as Token<unknown>;
    if (this.instances.has(key)) {
      dispose(this.instances.get(key));
      this.instances.delete(key);
    }
  }
}

export class ResolutionCache extends InstanceCache {}

export class SingletonCache extends InstanceCache {
  public clear(): void {
    for (const instance of this.instances.values()) {
      dispose(instance);
    }
    this.instances.clear();
  }
}
