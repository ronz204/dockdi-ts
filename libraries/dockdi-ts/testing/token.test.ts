import { type Token, token } from "@source/token";
import { expectTypeOf } from "expect-type";
import { describe, expect, it } from "vitest";

interface User {
  id: string;
}

interface AdminUser extends User {
  role: string;
}

describe("Branded Token (Token<T>)", () => {
  describe("Runtime Behavior", () => {
    it("creates a native symbol identifier", () => {
      const t = token<string>("service");

      expect(typeof t).toBe("symbol");
      expect(t.description).toBe("service");
      expect(t.toString()).toBe("Symbol(service)");
    });

    it("creates unique symbol references on each invocation", () => {
      const t1 = token<string>("service");
      const t2 = token<string>("service");

      expect(t1).not.toBe(t2);
      expect(t1 === t2).toBe(false);
    });

    it("supports undefined description cleanly", () => {
      const t = token<number>();

      expect(typeof t).toBe("symbol");
      expect(t.description).toBeUndefined();
      expect(t.toString()).toBe("Symbol()");
    });

    it("can be used as keys in Map and Set collections", () => {
      const t1 = token<string>("key1");
      const t2 = token<number>("key2");

      const map = new Map<Token<unknown>, unknown>();
      map.set(t1, "value1");
      map.set(t2, 42);

      expect(map.get(t1)).toBe("value1");
      expect(map.get(t2)).toBe(42);
      expect(map.size).toBe(2);

      const set = new Set<Token<unknown>>();
      set.add(t1);
      set.add(t2);
      expect(set.has(t1)).toBe(true);
      expect(set.has(t2)).toBe(true);
    });
  });

  describe("Static Type System Constraints", () => {
    it("infers exact Token<T> from token<T>() factory", () => {
      const strToken = token<string>("str");
      const userToken = token<User>("user");

      expectTypeOf(strToken).toEqualTypeOf<Token<string>>();
      expectTypeOf(userToken).toEqualTypeOf<Token<User>>();
    });

    it("prevents assignment between incompatible primitive types", () => {
      type StringToken = Token<string>;
      type NumberToken = Token<number>;
      type BooleanToken = Token<boolean>;

      expectTypeOf<StringToken>().not.toExtend<NumberToken>();
      expectTypeOf<NumberToken>().not.toExtend<StringToken>();
      expectTypeOf<StringToken>().not.toExtend<BooleanToken>();
    });

    it("prevents assignment between incompatible complex structural types", () => {
      type UserToken = Token<{ id: string }>;
      type ConfigToken = Token<{ port: number }>;

      expectTypeOf<UserToken>().not.toExtend<ConfigToken>();
      expectTypeOf<ConfigToken>().not.toExtend<UserToken>();
    });

    it("preserves safe covariance for subtypes", () => {
      type UserToken = Token<User>;
      type AdminToken = Token<AdminUser>;

      // A Token producing an AdminUser satisfies a consumer requesting a User
      expectTypeOf<AdminToken>().toExtend<UserToken>();

      // A Token producing a generic User does NOT satisfy a consumer requesting an AdminUser
      expectTypeOf<UserToken>().not.toExtend<AdminToken>();
    });
  });
});
