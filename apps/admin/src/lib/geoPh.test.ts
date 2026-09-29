import { describe, expect, it } from "vitest";
import { COUNTRIES, PROVINCES, citiesOf, provincesOf } from "./geoPh";

describe("geoPh constants", () => {
  it("covers all 82 Philippine provinces", () => {
    expect(PROVINCES.length).toBe(82);
    expect(new Set(PROVINCES.map((p) => p.name)).size).toBe(82);
  });

  it("gives every province at least one city", () => {
    for (const p of PROVINCES) {
      expect(citiesOf(p.name).length, p.name).toBeGreaterThan(0);
    }
  });

  it("resolves provinces by region, including SOCCSKSARGEN", () => {
    const names = provincesOf("SOCCSKSARGEN").map((p) => p.name);
    expect(names).toEqual(
      expect.arrayContaining(["South Cotabato", "Sarangani", "Sultan Kudarat", "Cotabato"]),
    );
  });

  it("covers the pilot city", () => {
    expect(citiesOf("South Cotabato")).toContain("General Santos");
  });

  it("returns empty for unknown provinces", () => {
    expect(citiesOf("Narnia")).toEqual([]);
  });

  it("lists Philippines first among countries", () => {
    expect(COUNTRIES[0]).toBe("Philippines");
  });
});
