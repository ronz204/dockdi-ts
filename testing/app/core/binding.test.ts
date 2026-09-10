import type { BindingBuilder, ScopedBindingBuilder, ScopeType } from "dockdi";
import { expectTypeOf } from "expect-type";
import { describe, it } from "vitest";

describe("Binding Types and Interfaces", () => {
  it("constrains ScopeType to exact supported union literals", () => {
    expectTypeOf<ScopeType>().toEqualTypeOf<
      "transient" | "singleton" | "resolution"
    >();
  });

  it("ensures ScopedBindingBuilder defines all scope configuration methods", () => {
    expectTypeOf<ScopedBindingBuilder>().toHaveProperty("inSingletonScope");
    expectTypeOf<ScopedBindingBuilder>().toHaveProperty("inTransientScope");
    expectTypeOf<ScopedBindingBuilder>().toHaveProperty("inResolutionScope");
  });

  it("ensures BindingBuilder defines toValue, toClass and toFactory", () => {
    expectTypeOf<BindingBuilder<string>>().toHaveProperty("toValue");
    expectTypeOf<BindingBuilder<string>>().toHaveProperty("toClass");
    expectTypeOf<BindingBuilder<string>>().toHaveProperty("toFactory");
  });
});
