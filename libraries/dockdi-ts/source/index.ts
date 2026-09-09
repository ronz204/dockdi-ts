export const VERSION: string = "1.0.0";

export type {
  Binding,
  BindingBuilder,
  BindingType,
  ScopedBindingBuilder,
  ScopeType,
} from "./binding";
export {
  type Constructor,
  instantiate,
  type TokenResolver,
  type TokensForArgs,
} from "./constructor";
export { Container } from "./container";
export { type Token, token } from "./token";
