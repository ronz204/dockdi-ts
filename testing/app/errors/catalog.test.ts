import {
  BindingConflictError,
  CircularDependencyError,
  DockdiError,
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
    expect(missing.activeStack).toEqual([]);
  });

  it("formats MissingTokenError with suggestions when provided", () => {
    const t = token<string>("target");
    const missing = new MissingTokenError(
      t,
      [],
      ["targetService", "targetRepo"],
    );

    expect(missing.message).toContain("Token not registered: Token[target]");
    expect(missing.message).toContain(
      "Did you mean: Token[targetService], Token[targetRepo]?",
    );
  });
});
