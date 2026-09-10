import { delay } from "@helpers/fixtures";
import { ResolutionStorage, SingletonStorage } from "@service/caching";
import { token } from "dockdi";
import { describe, expect, it } from "vitest";

describe("Caching and Lifecycle Storage", () => {
  describe("SingletonStorage", () => {
    it("caches resolved instance upon first execution", async () => {
      const storage = new SingletonStorage();
      const t = token<object>("obj");
      let count = 0;

      const first = await storage.remember(t, async () => {
        count++;
        return { count };
      });

      const second = await storage.remember(t, async () => {
        count++;
        return { count };
      });

      expect(count).toBe(1);
      expect(first).toBe(second);
    });

    it("deduplicates concurrent in-flight promises", async () => {
      const storage = new SingletonStorage();
      const t = token<string>("concurrent");
      let callCount = 0;

      const producer = async (): Promise<string> => {
        callCount++;
        await delay(20);
        return "ready";
      };

      const [res1, res2, res3] = await Promise.all([
        storage.remember(t, producer),
        storage.remember(t, producer),
        storage.remember(t, producer),
      ]);

      expect(callCount).toBe(1);
      expect(res1).toBe("ready");
      expect(res2).toBe("ready");
      expect(res3).toBe("ready");
    });

    it("cleans up in-flight promise on error to allow retries", async () => {
      const storage = new SingletonStorage();
      const t = token<string>("retry");
      let fail = true;

      const failingProducer = async (): Promise<string> => {
        if (fail) throw new Error("transient network failure");
        return "recovered";
      };

      await expect(storage.remember(t, failingProducer)).rejects.toThrow(
        "transient network failure",
      );

      fail = false;
      const success = await storage.remember(t, failingProducer);
      expect(success).toBe("recovered");
    });

    it("clears cached instances on clear()", async () => {
      const storage = new SingletonStorage();
      const t = token<number>("counter");
      let count = 0;

      await storage.remember(t, async () => ++count);
      expect(count).toBe(1);

      storage.clear();

      await storage.remember(t, async () => ++count);
      expect(count).toBe(2);
    });
  });

  describe("ResolutionStorage", () => {
    it("shares promise during resolution lifecycle", async () => {
      const storage = new ResolutionStorage();
      const t = token<object>("resolution");
      let factoryCalls = 0;

      const task1 = storage.remember(t, async () => {
        factoryCalls++;
        return { id: 1 };
      });

      const task2 = storage.remember(t, async () => {
        factoryCalls++;
        return { id: 2 };
      });

      const [val1, val2] = await Promise.all([task1, task2]);
      expect(factoryCalls).toBe(1);
      expect(val1).toBe(val2);
    });
  });
});
