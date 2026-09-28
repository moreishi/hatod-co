import { describe, expect, it } from "vitest";
import { validateZonePricing } from "./zones";

describe("validateZonePricing", () => {
  it("accepts sane pricing in centavos-free pesos", () => {
    expect(
      validateZonePricing({ base: 40, perKm: 12, perMin: 2, minimum: 60 }),
    ).toEqual({ base: 40, perKm: 12, perMin: 2, minimum: 60 });
  });

  it("rejects negatives and minimum-below-base", () => {
    expect(() =>
      validateZonePricing({ base: -1, perKm: 12, perMin: 2, minimum: 60 }),
    ).toThrow(/base/i);
    expect(() =>
      validateZonePricing({ base: 100, perKm: 12, perMin: 2, minimum: 60 }),
    ).toThrow(/minimum/i);
  });
});
