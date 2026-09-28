import { describe, expect, it } from "vitest";
import { haversineM } from "./geo";

describe("haversineM", () => {
  it("is zero for identical points", () => {
    expect(haversineM(6.1164, 125.1712, 6.1164, 125.1712)).toBe(0);
  });

  it("matches 1 degree of latitude ≈ 111.195km", () => {
    expect(haversineM(0, 0, 1, 0)).toBeCloseTo(111194.9, 0);
  });

  it("is symmetric", () => {
    const a = haversineM(6.1164, 125.1712, 6.112, 125.175);
    const b = haversineM(6.112, 125.175, 6.1164, 125.1712);
    expect(a).toBe(b);
  });
});
