import { describe, expect, it } from "vitest";
import cebu from "../geography/cebu.json" with { type: "json" };
import ph from "../geography/philippines.json" with { type: "json" };

/** Spec §11 + rules 16-20: stable codes, hierarchy integrity, no duplicates. */
describe("cebu pilot geography", () => {
  it("anchors every city to the Cebu province code", () => {
    for (const city of cebu.cities) {
      expect(city.parent).toBe(cebu.province.code);
    }
  });

  it("uses unique codes across province, cities, and barangays", () => {
    const codes = [
      cebu.province.code,
      ...cebu.cities.map((c) => c.code),
      ...cebu.cities.flatMap((c) => c.barangays.map((b) => b.code)),
    ];
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("nests barangay codes under their city code", () => {
    for (const city of cebu.cities) {
      for (const brgy of city.barangays) {
        expect(brgy.code.startsWith(city.code.slice(0, 6))).toBe(true);
      }
    }
  });

  it("ships a usable pilot market (4 cities, >=8 barangays each)", () => {
    expect(cebu.cities).toHaveLength(4);
    for (const city of cebu.cities) {
      expect(city.barangays.length).toBeGreaterThanOrEqual(8);
    }
  });
});

describe("philippines region stub", () => {
  it("lists Cebu under Region VII", () => {
    const regionVII = ph.regions.find((r) => r.code === "07");
    expect(regionVII?.provinces.map((p) => p.code)).toContain(
      cebu.province.code,
    );
  });
});
