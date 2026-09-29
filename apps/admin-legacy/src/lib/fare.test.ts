import { describe, expect, it } from "vitest";
import { calculateFare } from "./fare";

const pricing = { base: 40, perKm: 12, perMin: 2, minimum: 60 };

describe("calculateFare", () => {
  it("computes base + distance + time", () => {
    // 5km, 12min: 40 + 60 + 24 = 124
    expect(calculateFare({ distanceM: 5000, durationS: 720, pricing })).toBe(124);
  });

  it("enforces minimum fare", () => {
    expect(calculateFare({ distanceM: 100, durationS: 30, pricing })).toBe(60);
  });

  it("rejects negative input", () => {
    expect(() => calculateFare({ distanceM: -1, durationS: 0, pricing })).toThrow();
  });
});
