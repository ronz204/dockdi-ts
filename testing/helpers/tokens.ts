import { type Token, token } from "dockdi";

export interface Database {
  query(sql: string): Promise<string>;
}

export interface Logger {
  log(message: string): void;
}

export interface AuthService {
  isAuthenticated(token: string): boolean;
}

export interface ConfigService {
  get(key: string): string;
}

export const StringToken: Token<string> = token<string>("StringToken");
export const NumberToken: Token<number> = token<number>("NumberToken");
export const DatabaseToken: Token<Database> = token<Database>("Database");
export const LoggerToken: Token<Logger> = token<Logger>("Logger");
export const AuthToken: Token<AuthService> = token<AuthService>("AuthService");
export const ConfigToken: Token<ConfigService> =
  token<ConfigService>("ConfigService");
