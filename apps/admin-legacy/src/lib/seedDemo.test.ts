import { describe, expect, it } from "vitest";
import { makeRng, pick, pickInt } from "./seedDemo";

describe("makeRng (deterministic demo data)", () => {
  it("replays the same sequence per seed", () => {
    const a = makeRng(42);
    const b = makeRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("differs across seeds", () => {
    expect(makeRng(1)()).not.toBe(makeRng(2)());
  });
});

describe("pick helpers", () => {
  it("picks within bounds", () => {
    const rng = makeRng(7);
    for (let i = 0; i < 50; i++) {
      expect(pickInt(rng, 5, 30)).toBeGreaterThanOrEqual(5);
      expect(pickInt(rng, 5, 30)).toBeLessThanOrEqual(30);
      expect(["a", "b"]).toContain(pick(rng, ["a", "b"]));
    }
  });
});
