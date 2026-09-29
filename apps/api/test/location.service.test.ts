import { describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { LocationService } from "../src/location/location.service.js";

function serviceWith(db: Record<string, unknown>) {
  return new LocationService(db as unknown as PrismaService);
}

describe("LocationService (routing spec §36)", () => {
  it("rejects out-of-range coordinates", async () => {
    const svc = serviceWith({
      driver: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "d-1" }) },
    });
    await expect(svc.ping("u-1", { lat: 91, lng: 0 })).rejects.toThrow(
      "lat out of range",
    );
    await expect(svc.ping("u-1", { lat: 10, lng: 200 })).rejects.toThrow(
      "lng out of range",
    );
    await expect(
      svc.ping("u-1", { lat: 10, lng: 123, accuracyM: -1 }),
    ).rejects.toThrow("accuracyM out of range");
  });

  it("stores pings for the driver's own profile", async () => {
    const create = vi
      .fn()
      .mockImplementation((a: { data: object }) =>
        Promise.resolve({ id: "p-1", ...a.data }),
      );
    const svc = serviceWith({
      driver: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "d-1" }) },
      locationPing: { create },
    });
    const ping = (await svc.ping("u-1", {
      lat: 10.3,
      lng: 123.9,
      accuracyM: 8,
    })) as {
      driverId: string;
    };
    expect(ping.driverId).toBe("d-1");
  });

  it("ranks nearby drivers by distance and drops those outside radius", async () => {
    const svc = serviceWith({
      driver: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "near",
            user: { displayName: "Near" },
            assignments: [{ vehicle: { plateNo: "A" } }],
            pings: [{ lat: 10.3181, lng: 123.9054 }],
          },
          {
            id: "far",
            user: { displayName: "Far" },
            assignments: [],
            pings: [{ lat: 11.0, lng: 124.5 }],
          },
          {
            id: "silent",
            user: { displayName: "Silent" },
            assignments: [],
            pings: [],
          },
        ]),
      },
    });
    const nearby = await svc.nearby("ag-1", 10.3181, 123.9054, 5);
    expect(nearby.map((d) => d.driverId)).toEqual(["near"]);
    expect(nearby[0].distanceKm).toBe(0);
  });
});
