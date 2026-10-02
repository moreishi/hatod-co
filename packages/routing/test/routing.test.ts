import { describe, expect, it } from "vitest";
import {
  HaversineProvider,
  OsrmProvider,
  RoutingService,
  haversineKm,
} from "../src/index.js";

// Ayala Center Cebu -> SM City Cebu: ~2.5km straight line in reality.
const AYALA = { lat: 10.3181, lng: 123.9054 };
const SM_CITY = { lat: 10.3111, lng: 123.9185 };

describe("haversineKm", () => {
  it("measures Cebu City hops in a sane range", () => {
    const km = haversineKm(AYALA, SM_CITY);
    expect(km).toBeGreaterThan(1);
    expect(km).toBeLessThan(5);
  });

  it("is zero for identical points and symmetric", () => {
    expect(haversineKm(AYALA, AYALA)).toBe(0);
    expect(haversineKm(AYALA, SM_CITY)).toBeCloseTo(
      haversineKm(SM_CITY, AYALA),
      9,
    );
  });
});

describe("RoutingService with HaversineProvider", () => {
  const svc = new RoutingService(new HaversineProvider());

  it("quotes distance, duration, and provider", async () => {
    const route = await svc.calculateRoute(AYALA, SM_CITY, {
      vehicleType: "SEDAN",
    });
    expect(route.provider).toBe("haversine");
    expect(route.distanceKm).toBeGreaterThan(0);
    expect(route.durationSec).toBeGreaterThan(0);
  });

  it("prices motorcycles faster than vans", async () => {
    const moto = await svc.calculateRoute(AYALA, SM_CITY, {
      vehicleType: "MOTORCYCLE",
    });
    const van = await svc.calculateRoute(AYALA, SM_CITY, {
      vehicleType: "VAN",
    });
    expect(moto.durationSec).toBeLessThan(van.durationSec);
    expect(moto.distanceKm).toBe(van.distanceKm);
  });

  it("exposes ETA and distance helpers", async () => {
    const eta = await svc.calculateETA(AYALA, SM_CITY, {
      vehicleType: "SEDAN",
    });
    expect(eta.etaSec).toBeGreaterThan(0);
    expect(
      await svc.calculateDistance(AYALA, SM_CITY, { vehicleType: "SEDAN" }),
    ).toBeCloseTo(haversineKm(AYALA, SM_CITY), 2);
  });

  it("routes the expanded fleet: taxi, cars, trucks", async () => {
    for (const vehicleType of [
      "TAXI",
      "CAR_4SEATER",
      "CAR_6SEATER",
      "TRUCK_600KG",
      "TRUCK_600KG_MOVER",
      "TRUCK_1000KG",
      "TRUCK_2000KG",
    ] as const) {
      const route = await svc.calculateRoute(AYALA, SM_CITY, { vehicleType });
      expect(route.distanceKm).toBeGreaterThan(0);
      expect(route.durationSec).toBeGreaterThan(0);
    }
    const moto = await svc.calculateRoute(AYALA, SM_CITY, {
      vehicleType: "MOTORCYCLE",
    });
    const truck = await svc.calculateRoute(AYALA, SM_CITY, {
      vehicleType: "TRUCK_2000KG",
    });
    expect(truck.durationSec).toBeGreaterThan(moto.durationSec);
  });

  it("returns empty geometry (no road shape locally)", async () => {
    const route = await svc.calculateRoute(AYALA, SM_CITY, {
      vehicleType: "SEDAN",
    });
    expect(route.geometry).toBe("");
  });
});

describe("OsrmProvider", () => {
  const osrmOk = {
    code: "Ok",
    routes: [{ distance: 5200, duration: 780, geometry: "encoded-shape" }],
  };
  const fetchOk = async () => ({
    ok: true,
    status: 200,
    json: async () => osrmOk,
  });

  it("parses distance, duration, and geometry from OSRM", async () => {
    const seen: string[] = [];
    const p = new OsrmProvider({
      baseUrl: "http://osrm.test",
      fetchFn: (async (url: string) => {
        seen.push(url);
        return fetchOk();
      }) as typeof fetch,
    });
    const route = await p.calculateRoute(AYALA, SM_CITY, {
      vehicleType: "MOTORCYCLE",
    });
    expect(route.provider).toBe("osrm");
    expect(route.distanceKm).toBeCloseTo(5.2, 2);
    expect(route.durationSec).toBe(780);
    expect(route.geometry).toBe("encoded-shape");
    expect(seen[0]).toContain("123.9054,10.3181");
    expect(seen[0]).toContain("geometries=polyline");
  });

  it("falls back to haversine (empty geometry) when OSRM fails", async () => {
    const p = new OsrmProvider({
      fetchFn: (async () => {
        throw new Error("osrm down");
      }) as typeof fetch,
    });
    const route = await p.calculateRoute(AYALA, SM_CITY, {
      vehicleType: "SEDAN",
    });
    expect(route.provider).toBe("haversine");
    expect(route.distanceKm).toBeGreaterThan(0);
    expect(route.geometry).toBe("");
  });
});
