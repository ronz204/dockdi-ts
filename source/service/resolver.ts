import type { Assembler } from "@core/assembler";
import type { Binding } from "@core/binding";
import type { Token } from "@core/token";
import { CircularDependencyError, MissingTokenError } from "@errors/catalog";
import { findTokenSuggestions } from "@errors/suggest";
import { ResolutionStorage, type SingletonStorage } from "./caching";

class ResolutionSession {
  constructor(
    public readonly activeStack: readonly Token<unknown>[] = [],
    public readonly resolutionStorage: ResolutionStorage = new ResolutionStorage(),
  ) {}

  public push(token: Token<unknown>): ResolutionSession {
    return new ResolutionSession(
      [...this.activeStack, token],
      this.resolutionStorage,
    );
  }
}

export class Resolver {
  constructor(
    private readonly registry: Map<Token<unknown>, Binding<unknown>>,
    private readonly singletonStorage: SingletonStorage,
  ) {}

  public async resolve<T>(token: Token<T>): Promise<T> {
    return await this.resolveWithSession(token, new ResolutionSession());
  }

  private async resolveWithSession<T>(
    token: Token<T>,
    session: ResolutionSession,
  ): Promise<T> {
    const tokenKey = token as Token<unknown>;

    const existingIndex = session.activeStack.indexOf(tokenKey);
    if (existingIndex !== -1) {
      const cycle = [...session.activeStack.slice(existingIndex), tokenKey];
      throw new CircularDependencyError(cycle);
    }

    const binding = this.registry.get(tokenKey);
    if (!binding) {
      const suggestions = findTokenSuggestions(tokenKey, this.registry);
      throw new MissingTokenError(tokenKey, session.activeStack, suggestions);
    }

    if (binding.type === "value") {
      return Promise.resolve(binding.provider as T);
    }

    if (binding.scope === "singleton") {
      return this.singletonStorage.remember(token, () =>
        this.execute<T>(binding, tokenKey, session),
      );
    }

    if (binding.scope === "resolution") {
      return session.resolutionStorage.remember(token, () =>
        this.execute<T>(binding, tokenKey, session),
      );
    }

    return this.execute<T>(binding, tokenKey, session);
  }

  private async execute<T>(
    binding: Binding<unknown>,
    tokenKey: Token<unknown>,
    session: ResolutionSession,
  ): Promise<T> {
    const nextSession = session.push(tokenKey);
    const dependencies = binding.dependencies ?? [];
    const resolvedArgs = await Promise.all(
      dependencies.map((dep) => this.resolveWithSession(dep, nextSession)),
    );

    if (binding.type === "class") {
      const Target = binding.provider as Assembler<T, unknown[]>;
      return new Target(...resolvedArgs);
    }

    const factory = binding.provider as (...args: unknown[]) => T | Promise<T>;
    return await factory(...resolvedArgs);
  }
}
