import { CircularDependencyError, Container, token } from "dockdi";
import { describe, expect, it } from "vitest";

interface Dependency {
  readonly name: string;
}

class Service {
  constructor(public readonly dependency: Dependency) {}
}

describe("Parent-first singleton isolation", () => {
  it.each(["class", "factory"] as const)(
    "honors a child override after the parent's %s singleton is cached",
    (provider) => {
      const dependency = token<Dependency>("dependency");
      const service = token<Service>("service");
      const parent = new Container();
      const original = { name: "original" };
      parent.bind(dependency).toValue(original);
      if (provider === "class") {
        parent.bind(service).toClass(Service, [dependency]).inSingleton();
      } else {
        parent
          .bind(service)
          .toFactory((value) => new Service(value), [dependency])
          .inSingleton();
      }

      const parentService = parent.resolve(service);
      const child = parent.scope();
      const replacement = { name: "replacement" };
      child.override(dependency).toValue(replacement);

      const childService = child.resolve(service);
      expect(childService.dependency).toBe(replacement);
      expect(childService).not.toBe(parentService);
      expect(child.resolve(service)).toBe(childService);
      expect(parent.resolve(service)).toBe(parentService);
      expect(parentService.dependency).toBe(original);
      expect(parent.scope().resolve(service)).toBe(parentService);
    },
  );

  it.each(["transient", "resolution", "singleton"] as const)(
    "honors overrides reached through a %s intermediary after parent resolution",
    (scope) => {
      const dependency = token<Dependency>("dependency");
      const inner = token<Service>("inner");
      const outer = token<{ inner: Service }>("outer");
      const parent = new Container();
      const original = { name: "original" };
      parent.bind(dependency).toValue(original);
      const binding = parent.bind(inner).toClass(Service, [dependency]);
      if (scope === "singleton") binding.inSingleton();
      if (scope === "resolution") binding.inResolution();
      parent
        .bind(outer)
        .toFactory((value) => ({ inner: value }), [inner])
        .inSingleton();

      const parentService = parent.resolve(outer);
      const child = parent.scope();
      const replacement = { name: "replacement" };
      child.override(dependency).toValue(replacement);

      const childService = child.resolve(outer);
      expect(childService.inner.dependency).toBe(replacement);
      expect(childService).not.toBe(parentService);
      expect(child.resolve(outer)).toBe(childService);
      expect(parent.resolve(outer)).toBe(parentService);
      expect(parentService.inner.dependency).toBe(original);
      expect(parent.scope().resolve(outer)).toBe(parentService);
    },
  );

  it("honors an override inherited from an intermediate scope", () => {
    const dependency = token<Dependency>("dependency");
    const service = token<Service>("service");
    const parent = new Container();
    parent.bind(dependency).toValue({ name: "original" });
    parent.bind(service).toClass(Service, [dependency]).inSingleton();
    const parentService = parent.resolve(service);
    const middle = parent.scope();
    const replacement = { name: "replacement" };
    middle.override(dependency).toValue(replacement);
    const child = middle.scope();

    const childService = child.resolve(service);
    expect(childService.dependency).toBe(replacement);
    expect(child.resolve(service)).toBe(childService);
    expect(parent.resolve(service)).toBe(parentService);
  });

  it("preserves sharing without invoking factories when an override is unrelated", () => {
    const dependency = token<Dependency>("dependency");
    const service = token<Service>("service");
    const unrelated = token<string>("unrelated");
    const parent = new Container();
    let calls = 0;
    parent.bind(dependency).toFactory(() => {
      calls++;
      return { name: "original" };
    });
    parent.bind(service).toClass(Service, [dependency]).inSingleton();
    parent.bind(unrelated).toValue("original");
    const parentService = parent.resolve(service);
    const child = parent.scope();
    child.override(unrelated).toValue("replacement");

    expect(child.resolve(service)).toBe(parentService);
    expect(child.resolve(service)).toBe(parentService);
    expect(parent.scope().resolve(service)).toBe(parentService);
    expect(calls).toBe(1);
  });

  it("does not recreate a shared transient branch when isolating another branch", () => {
    const dependency = token<Dependency>("dependency");
    const unrelated = token<object>("unrelated");
    const cached = token<{ value: object }>("cached");
    const service = token<{
      dependency: Dependency;
      cached: { value: object };
    }>("service");
    const parent = new Container();
    let calls = 0;
    parent.bind(dependency).toValue({ name: "original" });
    parent.bind(unrelated).toFactory(() => {
      calls++;
      return {};
    });
    parent
      .bind(cached)
      .toFactory((value) => ({ value }), [unrelated])
      .inSingleton();
    parent
      .bind(service)
      .toFactory(
        (value, shared) => ({ dependency: value, cached: shared }),
        [dependency, cached],
      )
      .inSingleton();
    const parentService = parent.resolve(service);
    const child = parent.scope();
    const replacement = { name: "replacement" };
    child.override(dependency).toValue(replacement);

    const childService = child.resolve(service);
    expect(childService.dependency).toBe(replacement);
    expect(childService.cached).toBe(parentService.cached);
    expect(calls).toBe(1);
  });

  it("keeps child reset and disposal separate from the parent's singleton", () => {
    const dependency = token<Dependency>("dependency");
    const service = token<{ dependency: Dependency; dispose(): void }>(
      "service",
    );
    const parent = new Container();
    const disposed: Dependency[] = [];
    const original = { name: "original" };
    parent.bind(dependency).toValue(original);
    parent
      .bind(service)
      .toFactory(
        (value) => ({
          dependency: value,
          dispose() {
            disposed.push(value);
          },
        }),
        [dependency],
      )
      .inSingleton();
    const parentService = parent.resolve(service);
    const child = parent.scope();
    const replacement = { name: "replacement" };
    child.override(dependency).toValue(replacement);
    const childService = child.resolve(service);

    child.reset();
    expect(disposed).toEqual([replacement]);
    expect(parent.resolve(service)).toBe(parentService);
    const rebuilt = child.resolve(service);
    expect(rebuilt).not.toBe(childService);
    expect(rebuilt.dependency).toBe(replacement);
  });

  it("retains cycle diagnostics when a child override introduces a cycle", () => {
    const dependency = token<Dependency>("dependency");
    const service = token<Service>("service");
    const parent = new Container();
    parent.bind(dependency).toValue({ name: "original" });
    parent.bind(service).toClass(Service, [dependency]).inSingleton();
    const parentService = parent.resolve(service);
    const child = parent.scope();
    child
      .override(dependency)
      .toFactory((value) => value.dependency, [service]);

    expect(() => child.resolve(service)).toThrow(CircularDependencyError);
    expect(parent.resolve(service)).toBe(parentService);
  });

  it("honors a child-local binding without requiring override()", () => {
    const dependency = token<Dependency>("dependency");
    const service = token<Service>("service");
    const parent = new Container();
    parent.bind(dependency).toValue({ name: "original" });
    parent.bind(service).toClass(Service, [dependency]).inSingleton();
    const parentService = parent.resolve(service);
    const child = parent.scope();
    const replacement = { name: "replacement" };
    child.bind(dependency).toValue(replacement);

    expect(child.resolve(service).dependency).toBe(replacement);
    expect(parent.resolve(service)).toBe(parentService);
  });

  it.each([false, true])(
    "preserves an ancestor's cached snapshot with unrelated local bindings: %s",
    (hasLocalBinding) => {
      const dependency = token<Dependency>("dependency");
      const missing = token<Dependency>("missing");
      const service = token<Service>("service");
      const parent = new Container();
      parent.bind(dependency).toValue({ name: "original" });
      parent.bind(service).toClass(Service, [dependency]).inSingleton();
      const parentService = parent.resolve(service);

      // Replacing the dependency does not invalidate the cached service.
      parent.override(dependency).toFactory((value) => value, [missing]);
      const child = parent.scope();
      if (hasLocalBinding)
        child.bind(token<string>("unrelated")).toValue("local");

      expect(parent.resolve(service)).toBe(parentService);
      expect(child.resolve(service)).toBe(parentService);
      expect(child.resolve(service)).toBe(parentService);
    },
  );
});
