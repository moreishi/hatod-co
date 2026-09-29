import { describe, expect, it } from "vitest";
import { COUNTRIES, PROVINCES, citiesOf, defaultCityFor, provincesOf, resolveProvince } from "./geoPh";

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

describe("resolveProvince (city ↔ province linkage)", () => {
  it("keeps the province when the city belongs to it", () => {
    expect(resolveProvince("Koronadal", "South Cotabato")).toBe("South Cotabato");
  });

  it("switches to the owning province for unique cities", () => {
    expect(resolveProvince("Mati", "South Cotabato")).toBe("Davao Oriental");
  });

  it("prefers the current province for ambiguous city names", () => {
    // San Carlos exists in Pangasinan and Negros Occidental — stay put when it fits.
    expect(resolveProvince("San Carlos", "Negros Occidental")).toBe("Negros Occidental");
    expect(resolveProvince("San Carlos", "South Cotabato")).toBe("Pangasinan");
  });

  it("returns null when the city is unknown or blank", () => {
    expect(resolveProvince("Narnia Town", "South Cotabato")).toBeNull();
    expect(resolveProvince("  ", "South Cotabato")).toBeNull();
  });
});

describe("defaultCityFor (province drives city)", () => {
  it("picks the first listed city of the province", () => {
    expect(defaultCityFor("South Cotabato")).toBe("General Santos");
  });

  it("falls back to empty for unknown provinces", () => {
    expect(defaultCityFor("Narnia")).toBe("");
  });
});
