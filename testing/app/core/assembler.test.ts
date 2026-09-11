import type { Constructor, Token, Tokens, TokensArg } from "dockdi";
import { expectTypeOf } from "expect-type";
import { describe, it } from "vitest";

class Service {
  constructor(
    public readonly name: string,
    public readonly port: number,
  ) {}
}

describe("Constructor and Tokens Type Mappings", () => {
  it("verifies Constructor type compatibility", () => {
    expectTypeOf(Service).toExtend<Constructor<Service, [string, number]>>();
  });

  it("maps constructor argument types to exact token tuples", () => {
    type ExpectedTuple = readonly [Token<string>, Token<number>];

    expectTypeOf<Tokens<[string, number]>>().toEqualTypeOf<ExpectedTuple>();
  });

  it("enforces exact token count and types in tuple", () => {
    expectTypeOf<readonly [Token<string>]>().not.toEqualTypeOf<
      Tokens<[string, number]>
    >();
    expectTypeOf<readonly [Token<string>, Token<string>]>().not.toEqualTypeOf<
      Tokens<[string, number]>
    >();
  });

  it("configures optional argument tuple for zero-arg constructors", () => {
    expectTypeOf<TokensArg<[string]>>().toEqualTypeOf<
      [tokens: readonly [Token<string>]]
    >();
  });

  it("allows omitting the tokens tuple when every constructor argument is optional", () => {
    function bindTokens<Args extends readonly unknown[]>(
      ..._tokens: TokensArg<Args>
    ): void {}

    bindTokens<[]>();
    bindTokens<[string?]>();
    bindTokens<[string?]>([]);
    bindTokens<[string?, number?]>();
    // @ts-expect-error a required constructor argument still needs its token
    bindTokens<[string]>();
    // @ts-expect-error a required argument followed by an optional one still needs its token
    bindTokens<[string, number?]>();
  });
});
