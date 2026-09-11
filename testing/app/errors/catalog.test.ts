import {
  BindingConflictError,
  CircularDependencyError,
  DockdiError,
  InstantiationError,
  MissingTokenError,
  token,
} from "dockdi";
import { describe, expect, it } from "vitest";

describe("Error Catalog Hierarchy", () => {
  it("ensures all custom errors inherit from DockdiError and Error", () => {
    const t = token<string>("test");
    const conflict = new BindingConflictError(t);
    const cycle = new CircularDependencyError([t]);
    const missing = new MissingTokenError(t, []);
    const rawError = new Error("Boom");
    const instantiation = new InstantiationError(t, [], rawError);

    expect(conflict).toBeInstanceOf(DockdiError);
    expect(conflict).toBeInstanceOf(Error);
    expect(conflict.name).toBe("BindingConflictError");
    expect(conflict.token).toBe(t);

    expect(cycle).toBeInstanceOf(DockdiError);
    expect(cycle).toBeInstanceOf(Error);
    expect(cycle.name).toBe("CircularDependencyError");
    expect(cycle.cycle).toEqual([t]);

    expect(missing).toBeInstanceOf(DockdiError);
    expect(missing).toBeInstanceOf(Error);
    expect(missing.name).toBe("MissingTokenError");
    expect(missing.token).toBe(t);
    expect(missing.path).toEqual([]);

    expect(instantiation).toBeInstanceOf(DockdiError);
    expect(instantiation).toBeInstanceOf(Error);
    expect(instantiation.name).toBe("InstantiationError");
    expect(instantiation.token).toBe(t);
    expect(instantiation.path).toEqual([]);
    expect(instantiation.cause).toBe(rawError);
    expect(instantiation.message).toContain(
      "Failed to instantiate Token[test]: Boom",
    );
  });

  it("formats MissingTokenError correctly", () => {
    const t = token<string>("target");
    const missing = new MissingTokenError(t, []);

    expect(missing.message).toContain("Token not registered: Token[target]");
  });
});
