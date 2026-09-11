import type { Binding } from "@core/binding";
import { RegistryBuilder } from "@service/builder";
import { BindingConflictError, type Token, token } from "dockdi";
import { describe, expect, it } from "vitest";

class ExampleService {}

describe("RegistryBuilder", () => {
  it("binds constant values via toValue", () => {
    const registry = new Map<Token<unknown>, Binding<unknown>>();
    const t = token<string>("config");
    const builder = new RegistryBuilder(t, registry);

    builder.toValue("production");

    const record = registry.get(t);
    expect(record).toBeDefined();
    expect(record?.type).toBe("value");
    expect(record?.provider).toBe("production");
  });

  it("binds classes and configures scope with zero-arg inference", () => {
    const registry = new Map<Token<unknown>, Binding<unknown>>();
    const t = token<ExampleService>("service");
    const builder = new RegistryBuilder(t, registry);

    builder.toClass(ExampleService).inSingleton();

    const record = registry.get(t);
    expect(record?.type).toBe("class");
    expect(record?.scope).toBe("singleton");
    expect(record?.provider).toBe(ExampleService);
  });

  it("binds factories and configures scope with zero-arg inference", () => {
    const registry = new Map<Token<unknown>, Binding<unknown>>();
    const t = token<number>("factory");
    const builder = new RegistryBuilder(t, registry);
    const factoryFn = () => 42;

    builder.toFactory(factoryFn).inResolution();

    const record = registry.get(t);
    expect(record?.type).toBe("factory");
    expect(record?.scope).toBe("resolution");
    expect(record?.provider).toBe(factoryFn);
  });

  it("throws BindingConflictError when binding duplicate token", () => {
    const registry = new Map<Token<unknown>, Binding<unknown>>();
    const t = token<string>("duplicate");

    new RegistryBuilder(t, registry).toValue("first");

    expect(() => new RegistryBuilder(t, registry)).toThrow(
      BindingConflictError,
    );
  });
});
