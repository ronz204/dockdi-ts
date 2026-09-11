import { ResolutionStorage, SingletonStorage } from "@service/caching";
import { token } from "dockdi";
import { describe, expect, it } from "vitest";

describe("Caching and Lifecycle Storage", () => {
  describe("SingletonStorage", () => {
    it("caches resolved instance upon first execution", () => {
      const storage = new SingletonStorage();
      const t = token<object>("obj");
      let count = 0;

      const first = storage.remember(t, () => {
        count++;
        return { count };
      });

      const second = storage.remember(t, () => {
        count++;
        return { count };
      });

      expect(count).toBe(1);
      expect(first).toBe(second);
    });

    it("invalidates cached instance on invalidate()", () => {
      const storage = new SingletonStorage();
      const t = token<{ count: number }>("obj");
      let count = 0;

      const first = storage.remember(t, () => ({ count: ++count }));
      expect(first.count).toBe(1);

      storage.invalidate(t);

      const second = storage.remember(t, () => ({ count: ++count }));
      expect(second.count).toBe(2);
      expect(first).not.toBe(second);
    });

    it("clears cached instances on clear()", () => {
      const storage = new SingletonStorage();
      const t = token<number>("counter");
      let count = 0;

      storage.remember(t, () => ++count);
      expect(count).toBe(1);

      storage.clear();

      storage.remember(t, () => ++count);
      expect(count).toBe(2);
    });
  });

  describe("ResolutionStorage", () => {
    it("shares instance during resolution lifecycle", () => {
      const storage = new ResolutionStorage();
      const t = token<object>("resolution");
      let factoryCalls = 0;

      const val1 = storage.remember(t, () => {
        factoryCalls++;
        return { id: 1 };
      });

      const val2 = storage.remember(t, () => {
        factoryCalls++;
        return { id: 2 };
      });

      expect(factoryCalls).toBe(1);
      expect(val1).toBe(val2);
    });
  });
});
