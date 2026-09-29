import { describe, expect, it } from "vitest";
import { backoffMs } from "../src/backoff.js";

describe("backoffMs", () => {
  it("doubles per attempt from the base", () => {
    expect(backoffMs(0)).toBe(1000);
    expect(backoffMs(1)).toBe(2000);
    expect(backoffMs(3)).toBe(8000);
  });

  it("caps at maxMs", () => {
    expect(backoffMs(10)).toBe(60_000);
    expect(backoffMs(10, 1000, 5000)).toBe(5000);
  });

  it("rejects negative attempts", () => {
    expect(() => backoffMs(-1)).toThrow("attempt must be >= 0");
  });
});
