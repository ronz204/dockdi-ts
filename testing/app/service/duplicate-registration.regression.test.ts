import {
  type BindingBuilder,
  BindingConflictError,
  Container,
  token,
} from "dockdi";
import { describe, expect, it } from "vitest";

interface Service {
  readonly name: string;
}

type Provider = "value" | "class" | "factory";

const providers: readonly Provider[] = ["value", "class", "factory"];

function register(
  builder: BindingBuilder<Service>,
  provider: Provider,
  name: string,
): void {
  switch (provider) {
    case "value":
      builder.toValue({ name });
      break;
    case "class":
      builder.toClass(
        class implements Service {
          readonly name: string = name;
        },
      );
      break;
    case "factory":
      builder.toFactory(() => ({ name }));
      break;
  }
}

describe("Duplicate registration public-API regression", () => {
  it.each(providers)(
    "rejects reusing a completed %s builder and preserves the original",
    (provider) => {
      const container = new Container();
      const service = token<Service>("service");
      const builder = container.bind(service);

      register(builder, provider, "first");
      expect(container.resolve(service).name).toBe("first");

      expect
        .soft(() => register(builder, provider, "second"))
        .toThrow(BindingConflictError);
      expect(container.resolve(service).name).toBe("first");
    },
  );

  it.each(providers)(
    "rejects a stale %s builder created before the first registration",
    (provider) => {
      const container = new Container();
      const service = token<Service>("service");
      const first = container.bind(service);
      const second = container.bind(service);

      register(first, provider, "first");
      expect(container.resolve(service).name).toBe("first");

      expect
        .soft(() => register(second, provider, "second"))
        .toThrow(BindingConflictError);
      expect(container.resolve(service).name).toBe("first");
    },
  );

  describe("Existing valid behavior controls", () => {
    it.each(providers)("allows an explicit %s override", (provider) => {
      const container = new Container();
      const service = token<Service>("service");
      register(container.bind(service), provider, "first");

      register(container.override(service), provider, "second");

      expect(container.resolve(service).name).toBe("second");
    });

    it("allows a child to bind an inherited token locally", () => {
      const parent = new Container();
      const service = token<Service>("service");
      parent.bind(service).toValue({ name: "first" });
      const child = parent.scope();

      child.bind(service).toValue({ name: "second" });

      expect(child.resolve(service).name).toBe("second");
      expect(parent.resolve(service).name).toBe("first");
    });
  });
});
