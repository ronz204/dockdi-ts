import type { Assembler, Token, TokensForArgs } from "dockdi";
import { expectTypeOf } from "expect-type";
import { describe, it } from "vitest";

class Service {
  constructor(
    public readonly name: string,
    public readonly port: number,
  ) {}
}

describe("Assembler and TokensForArgs", () => {
  it("verifies Assembler constructor type compatibility", () => {
    expectTypeOf(Service).toExtend<Assembler<Service, [string, number]>>();
  });

  it("maps constructor argument types to exact token tuples", () => {
    type ExpectedTuple = readonly [Token<string>, Token<number>];

    expectTypeOf<
      TokensForArgs<[string, number]>
    >().toEqualTypeOf<ExpectedTuple>();
  });

  it("enforces exact token count and types in tuple", () => {
    expectTypeOf<readonly [Token<string>]>().not.toEqualTypeOf<
      TokensForArgs<[string, number]>
    >();
    expectTypeOf<readonly [Token<string>, Token<string>]>().not.toEqualTypeOf<
      TokensForArgs<[string, number]>
    >();
  });
});
