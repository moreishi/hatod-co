import { describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { PlacesService } from "../src/places/places.service.js";

const dbRow = {
  id: "pl-1",
  name: "KCC Mall of Gensan",
  address: "KCC Mall of Gensan, Osmeña St, General Santos City",
  lat: 6.1117,
  lng: 125.1749,
  source: "seed",
  hitCount: 3,
};

function serviceWith(
  db: Record<string, unknown>,
  nominatim?: (query: string) => Promise<unknown[]>,
  reverseFetch?: typeof fetch,
) {
  return new PlacesService(db as unknown as PrismaService, {
    nominatimFn: nominatim as never,
    reverseFetchFn: reverseFetch,
    minGapMs: 0,
  });
}

describe("PlacesService (routing spec §29)", () => {
  it("rejects blank and single-char queries", async () => {
    const svc = serviceWith({ place: {} });
    await expect(svc.search(" ")).rejects.toThrow("query too short");
    await expect(svc.search("a")).rejects.toThrow("query too short");
  });

  it("returns cached rows without calling Nominatim", async () => {
    const findMany = vi.fn().mockResolvedValue([dbRow]);
    const update = vi.fn().mockResolvedValue(dbRow);
    const nominatim = vi.fn();
    const svc = serviceWith(
      { place: { findMany, update } },
      nominatim as never,
    );
    const res = await svc.search("kcc");
    expect(res).toHaveLength(1);
    expect(res[0].name).toBe("KCC Mall of Gensan");
    expect(nominatim).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalled();
  });

  it("falls back to Nominatim on cache miss and persists new rows", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const createMany = vi.fn().mockResolvedValue({ count: 1 });
    const nominatim = vi.fn().mockResolvedValue([
      {
        osm_type: "node",
        osm_id: 999,
        lat: "6.12",
        lon: "125.18",
        display_name: "Lagao Gym, Lagao, General Santos City",
      },
    ]);
    const svc = serviceWith(
      { place: { findMany, createMany } },
      nominatim as never,
    );
    const res = await svc.search("lagao gym");
    expect(nominatim).toHaveBeenCalledWith("lagao gym");
    expect(createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ providerId: "node/999" }),
      ]),
    });
    expect(res).toHaveLength(1);
    expect(res[0].name).toBe("Lagao Gym");
    expect(res[0].source).toBe("nominatim");
  });

  it("recalls cached rows when all query words match", async () => {
    const findMany = vi.fn().mockResolvedValue([dbRow]);
    const nominatim = vi.fn();
    const svc = serviceWith(
      { place: { findMany, update: vi.fn() } },
      nominatim as never,
    );
    // Row name "KCC Mall of Gensan": words out of order still hit.
    const res = await svc.search("gensan kcc");
    expect(res).toHaveLength(1);
    expect(nominatim).not.toHaveBeenCalled();
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ AND: expect.any(Array) }),
      }),
    );
  });

  it("reverse-geocodes GPS to city + area key", async () => {
    const reverseFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        address: {
          city: "General Santos",
          region: "Soccsksargen",
          "ISO3166-2-lvl3": "PH-12",
        },
        display_name: "General Santos, Soccsksargen, Philippines",
      }),
    });
    const svc = serviceWith({ place: {} }, undefined, reverseFetch as never);
    const area = await svc.reverse(6.1169, 125.1716);
    expect(area.city).toBe("General Santos");
    expect(area.areaKey).toBe("ph-12");
    expect(reverseFetch).toHaveBeenCalled();
  });

  it("reverse detail returns road-level names for pins", async () => {
    const reverseFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        address: {
          road: "Osmeña Street",
          suburb: "Dadiangas",
          city: "General Santos",
          region: "Soccsksargen",
          "ISO3166-2-lvl3": "PH-12",
        },
        display_name: "Osmeña Street, Dadiangas, General Santos",
      }),
    });
    const svc = serviceWith({ place: {} }, undefined, reverseFetch as never);
    const area = await svc.reverse(6.1117, 125.1749, true);
    expect(area.name).toBe("Osmeña Street");
    expect(area.city).toBe("General Santos");
    expect(area.areaKey).toBe("ph-12");
    expect(reverseFetch.mock.calls[0][0]).toContain("zoom=18");
  });

  it("reverse rejects out-of-range coordinates", async () => {
    const svc = serviceWith({ place: {} });
    await expect(svc.reverse(91, 0)).rejects.toThrow("lat out of range");
  });

  it("orders same-area rows before outside ones", async () => {
    const outside = {
      ...dbRow,
      id: "pl-9",
      name: "SM City Cebu",
      areaKey: "ph-07",
    };
    const inside = { ...dbRow, id: "pl-1", areaKey: "ph-12" };
    const svc = serviceWith({
      place: {
        findMany: vi.fn().mockResolvedValue([outside, inside]),
        update: vi.fn(),
      },
    });
    const res = await svc.search("mall", "ph-12");
    expect(res.map((r) => r.id)).toEqual(["pl-1", "pl-9"]);
    expect(res[0].areaKey).toBe("ph-12");
  });

  it("returns empty when both cache and Nominatim miss", async () => {
    const svc = serviceWith(
      { place: { findMany: vi.fn().mockResolvedValue([]) } },
      (async () => []) as never,
    );
    await expect(svc.search("zzz-no-such-place")).resolves.toEqual([]);
  });
});
