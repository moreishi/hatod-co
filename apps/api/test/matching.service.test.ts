import { describe, expect, it, vi } from "vitest";
import { MatchingService } from "../src/matching/matching.service.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";

const RIDE = {
  id: "ride-1",
  status: "REQUESTED",
  riderId: "rider-1",
  agencyId: "ag-1",
  driverId: null as string | null,
  pickupLat: 10.3181,
  pickupLng: 123.9054,
  vehicleType: "SEDAN",
};

const driverRow = (overrides: object = {}) => ({
  id: "d-1",
  status: "ACTIVE",
  isOnline: true,
  user: { id: "u-driver", displayName: "D" },
  assignments: [{ vehicleId: "v-1", vehicle: { id: "v-1", type: "SEDAN" } }],
  pings: [{ lat: 10.3181, lng: 123.9054, recordedAt: new Date() }],
  rides: [],
  ...overrides,
});

function serviceWith(db: Record<string, unknown>) {
  const prisma = {
    ride: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({ ...RIDE }),
      findUnique: vi.fn().mockResolvedValue({ ...RIDE }),
      update: vi
        .fn()
        .mockImplementation((a: { data: object }) => Promise.resolve(a.data)),
    },
    driver: {
      findMany: vi.fn().mockResolvedValue([driverRow()]),
      findUniqueOrThrow: vi.fn(),
    },
    driverVehicleAssignment: { findFirst: vi.fn() },
    rideEvent: { create: vi.fn().mockResolvedValue({}) },
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
    ...db,
  } as unknown as PrismaService;
  const notifications = { enqueue: vi.fn().mockResolvedValue({}) };
  const messaging = {
    ensureConversation: vi.fn().mockResolvedValue({}),
    postSystemMessage: vi.fn().mockResolvedValue({}),
    closeConversation: vi.fn().mockResolvedValue({}),
    deleteConversation: vi.fn().mockResolvedValue({}),
  };
  const realtime = { broadcastRide: vi.fn(), broadcastConversation: vi.fn() };
  const service = new MatchingService(
    prisma,
    notifications as never,
    messaging as never,
    realtime as never,
  );
  return Object.assign(service, {
    sent: notifications,
    chat: messaging,
    live: realtime,
  });
}

describe("MatchingService candidates (routing spec §12–§13)", () => {
  it("ranks dispatchable drivers and filters the rest", async () => {
    const svc = serviceWith({
      driver: {
        findMany: vi.fn().mockResolvedValue([
          driverRow({ id: "near" }),
          driverRow({ id: "offline", isOnline: false }),
          driverRow({ id: "busy", rides: [{ id: "other" }] }),
          driverRow({
            id: "stale",
            pings: [{ lat: 10.3, lng: 123.9, recordedAt: new Date(0) }],
          }),
          driverRow({
            id: "wrong-car",
            assignments: [
              { vehicleId: "v-9", vehicle: { id: "v-9", type: "VAN" } },
            ],
          }),
          driverRow({
            id: "far",
            pings: [{ lat: 11.5, lng: 125.0, recordedAt: new Date() }],
          }),
        ]),
        findUniqueOrThrow: vi.fn(),
      },
    });
    const candidates = await svc.findCandidates("ride-1");
    expect(candidates.map((c) => c.driverId)).toEqual(["near"]);
  });

  it("returns empty without pickup coordinates", async () => {
    const svc = serviceWith({
      ride: {
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValue({ ...RIDE, pickupLat: null }),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    });
    expect(await svc.findCandidates("ride-1")).toEqual([]);
  });
});

describe("MatchingService offers", () => {
  it("offers, accepts, and parks at NO_DRIVERS when exhausted", async () => {
    const svc = serviceWith({});
    const offered = (await svc.matchRide("ride-1")) as { driverId: string };
    expect(offered.driverId).toBe("d-1");
    expect(svc.sent.enqueue).toHaveBeenCalled();

    const mine = await svc.offersFor("u-driver");
    expect(mine).toHaveLength(1);

    await expect(svc.acceptOffer("ride-1", "u-stranger")).rejects.toThrow(
      "no pending offer",
    );
  });

  it("declines to the next candidate, then parks", async () => {
    const svc = serviceWith({
      driver: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([driverRow({ id: "d-1" })])
          .mockResolvedValueOnce([
            driverRow({ id: "d-2", user: { id: "u-2", displayName: "D2" } }),
          ])
          .mockResolvedValue([]),
        findUniqueOrThrow: vi.fn(),
      },
    });
    await svc.matchRide("ride-1");
    const second = (await svc.declineOffer("ride-1", "u-driver")) as {
      driverId: string;
    } | null;
    expect(second?.driverId).toBe("d-2");
    const parked = await svc.declineOffer("ride-1", "u-2");
    expect(parked).toBeNull();
  });

  it("expires offers and moves on", async () => {
    vi.useFakeTimers();
    try {
      const svc = serviceWith({
        driver: {
          findMany: vi
            .fn()
            .mockResolvedValueOnce([driverRow({ id: "d-1" })])
            .mockResolvedValue([]),
          findUniqueOrThrow: vi.fn(),
        },
      });
      await svc.matchRide("ride-1");
      expect(await svc.offersFor("u-driver")).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(31_000);
      expect(await svc.offersFor("u-driver")).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("only auto-matches REQUESTED rides", async () => {
    const svc = serviceWith({
      ride: {
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValue({ ...RIDE, status: "ASSIGNED" }),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    });
    expect(await svc.matchRide("ride-1")).toBeNull();
  });
});
