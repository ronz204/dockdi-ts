import type { BindingBuilder, ScopeBuilder, ScopeType } from "dockdi";
import { expectTypeOf } from "expect-type";
import { describe, it } from "vitest";

describe("Binding Types and Interfaces", () => {
  it("constrains ScopeType to exact supported union literals", () => {
    expectTypeOf<ScopeType>().toEqualTypeOf<
      "transient" | "singleton" | "resolution"
    >();
  });

  it("ensures ScopeBuilder defines all scope configuration methods", () => {
    expectTypeOf<ScopeBuilder>().toHaveProperty("inSingleton");
    expectTypeOf<ScopeBuilder>().toHaveProperty("inTransient");
    expectTypeOf<ScopeBuilder>().toHaveProperty("inResolution");
  });

  it("ensures BindingBuilder defines toValue, toClass and toFactory", () => {
    expectTypeOf<BindingBuilder<string>>().toHaveProperty("toValue");
    expectTypeOf<BindingBuilder<string>>().toHaveProperty("toClass");
    expectTypeOf<BindingBuilder<string>>().toHaveProperty("toFactory");
  });
});
