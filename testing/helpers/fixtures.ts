import type { AuthService, ConfigService, Database, Logger } from "./tokens";

export class ConsoleLogger implements Logger {
  public logs: string[] = [];

  public log(message: string): void {
    this.logs.push(message);
  }
}

export class SqlDatabase implements Database {
  public queries: string[] = [];

  constructor(public readonly connectionString: string = "memory://") {}

  public async query(sql: string): Promise<string> {
    this.queries.push(sql);
    return `result:${sql}`;
  }
}

export class AppConfig implements ConfigService {
  constructor(private readonly values: Record<string, string> = {}) {}

  public get(key: string): string {
    return this.values[key] ?? "";
  }
}

export class SessionAuth implements AuthService {
  constructor(
    public readonly db: Database,
    public readonly logger: Logger,
  ) {}

  public isAuthenticated(token: string): boolean {
    this.logger.log(`auth:${token}`);
    return token === "valid-token";
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
