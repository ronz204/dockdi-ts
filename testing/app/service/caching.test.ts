import { ResolutionCache, SingletonCache } from "@service/caching";
import { token } from "dockdi";
import { describe, expect, it } from "vitest";

describe("Caching and Lifecycle Storage", () => {
  describe("SingletonCache", () => {
    it("caches resolved instance upon first execution", () => {
      const storage = new SingletonCache();
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

    it("clears cached instances on clear()", () => {
      const storage = new SingletonCache();
      const t = token<number>("counter");
      let count = 0;

      storage.remember(t, () => ++count);
      expect(count).toBe(1);

      storage.clear();

      storage.remember(t, () => ++count);
      expect(count).toBe(2);
    });

    it("invokes dispose() and [Symbol.dispose]() upon clear()", () => {
      const storage = new SingletonCache();
      let disposed1 = false;
      let disposed2 = false;

      const t1 = token<object>("obj1");
      const t2 = token<object>("obj2");

      storage.remember(t1, () => ({
        dispose() {
          disposed1 = true;
        },
      }));

      storage.remember(t2, () => ({
        [Symbol.dispose]() {
          disposed2 = true;
        },
      }));

      expect(disposed1).toBe(false);
      expect(disposed2).toBe(false);

      storage.clear();
      expect(disposed1).toBe(true);
      expect(disposed2).toBe(true);
    });

    it("evicts a cached instance whose value is undefined", () => {
      const storage = new SingletonCache();
      const t = token<unknown>("undef");

      storage.remember(t, () => undefined);
      storage.delete(t);

      let calls = 0;
      const result = storage.remember(t, () => {
        calls++;
        return "replaced";
      });

      expect(calls).toBe(1);
      expect(result).toBe("replaced");
    });
  });

  describe("ResolutionCache", () => {
    it("shares instance during resolution lifecycle", () => {
      const storage = new ResolutionCache();
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
