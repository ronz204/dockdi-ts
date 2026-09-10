import {
  describeToken,
  formatResolutionPath,
  formatTokenChain,
} from "@errors/helpers";
import { token } from "dockdi";
import { describe, expect, it } from "vitest";

describe("Error Formatting Helpers", () => {
  it("describes named and unnamed tokens correctly", () => {
    const named = token<string>("database");
    const unnamed = token<number>();

    expect(describeToken(named)).toBe("Token[database]");
    expect(describeToken(unnamed)).toBe("Symbol()");
  });

  it("formats token resolution chains", () => {
    const a = token<string>("A");
    const b = token<string>("B");
    const c = token<string>("C");

    const chain = formatTokenChain([a, b, c, a]);
    expect(chain).toBe("Token[A] -> Token[B] -> Token[C] -> Token[A]");
  });

  it("formats indented resolution path", () => {
    const a = token<string>("A");
    const b = token<string>("B");
    const target = token<string>("Target");

    const path = formatResolutionPath([a, b], target);
    expect(path).toContain(
      "Resolution path:\nToken[A]\n  └─> Token[B]\n    └─> Token[Target] (FAILED)",
    );
  });

  it("returns empty string when resolution stack is empty", () => {
    const target = token<string>("Target");
    expect(formatResolutionPath([], target)).toBe("");
  });
});
