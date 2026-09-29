import { describe, expect, it } from "vitest";
import {
  HaversineProvider,
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
});
