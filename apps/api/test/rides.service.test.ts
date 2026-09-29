import { describe, expect, it, vi } from "vitest";
import { RideStatus } from "@hailing/constants";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { quoteFare } from "../src/rides/fare.js";
import { RideTransitionGuard } from "../src/rides/ride-transition.guard.js";
import { RidesService } from "../src/rides/rides.service.js";

describe("quoteFare (spec rule 37)", () => {
  it("charges base + per-km by vehicle type", () => {
    const sedan = quoteFare({ vehicleType: "SEDAN", distanceKm: 10 });
    expect(sedan.fareCentavos).toBe(4000 + 10 * 1500);
    expect(sedan.driverCentavos + sedan.commissionCentavos).toBe(
      sedan.fareCentavos,
    );
    expect(sedan.commissionCentavos).toBe(Math.round(sedan.fareCentavos * 0.2));
  });

  it("enforces the minimum fare on short trips", () => {
    const short = quoteFare({ vehicleType: "MOTORCYCLE", distanceKm: 0.5 });
    expect(short.fareCentavos).toBe(6000);
  });

  it("rejects unknown vehicle types", () => {
    expect(() =>
      quoteFare({ vehicleType: "TRICYCLE" as never, distanceKm: 5 }),
    ).toThrow("unknown vehicle type");
  });
});

function serviceWith(db: Record<string, unknown>) {
  const prisma = {
    ...db,
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: "actor",
        phone: "09170000001",
        adminRoles: [{ role: "OPS" }],
        agencyMemberships: [],
      }),
      ...(typeof db.user === "object" && db.user !== null ? db.user : {}),
    },
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
  } as unknown as PrismaService;
  const notifications = { enqueue: vi.fn().mockResolvedValue({}) };
  const realtime = { broadcastRide: vi.fn(), broadcastConversation: vi.fn() };
  const messaging = {
    ensureConversation: vi.fn().mockResolvedValue({}),
    postSystemMessage: vi.fn().mockResolvedValue({}),
    closeConversation: vi.fn().mockResolvedValue({}),
    deleteConversation: vi.fn().mockResolvedValue({}),
  };
  const service = new RidesService(
    prisma,
    new RideTransitionGuard(),
    notifications as never,
    realtime as never,
    messaging as never,
  );
  return Object.assign(service, {
    sent: notifications,
    live: realtime,
    chat: messaging,
  });
}

const dto = {
  pickupLabel: "A",
  pickupBrgyCode: "072217001",
  dropoffLabel: "B",
  dropoffBrgyCode: "072230001",
  distanceKm: 5,
  vehicleType: "SEDAN" as const,
  paymentMethod: "CASH" as const,
};

describe("RidesService", () => {
  it("requests a ride as REQUESTED with a quoted fare", async () => {
    const create = vi
      .fn()
      .mockImplementation((args: { data: object }) =>
        Promise.resolve(args.data),
      );
    const svc = serviceWith({ ride: { create } });
    const ride = (await svc.requestRide("rider-1", dto)) as {
      status: string;
      fareCentavos: number;
    };
    expect(ride.status).toBe(RideStatus.REQUESTED);
    expect(ride.fareCentavos).toBe(4000 + 5 * 1500);
  });

  it("assigns only dispatchable drivers with an active vehicle", async () => {
    const mk = (driver: object) =>
      serviceWith({
        ride: {
          findUniqueOrThrow: vi.fn().mockResolvedValue({
            id: "ride-1",
            status: "REQUESTED",
            riderId: "rider-1",
          }),
          update: vi
            .fn()
            .mockImplementation((a: { data: object }) =>
              Promise.resolve(a.data),
            ),
        },
        driver: { findUniqueOrThrow: vi.fn().mockResolvedValue(driver) },
        rideEvent: { create: vi.fn().mockResolvedValue({}) },
      });
    const good = {
      id: "d-1",
      agencyId: "ag-1",
      status: "ACTIVE",
      isOnline: true,
      user: { id: "u-driver", displayName: "D" },
      assignments: [{ vehicleId: "v-1" }],
    };
    const assignedSvc = mk(good);
    const assigned = (await assignedSvc.assignRide(
      "ride-1",
      "d-1",
      "actor",
    )) as {
      status: string;
    };
    expect(assigned.status).toBe(RideStatus.ASSIGNED);
    expect(assignedSvc.sent.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ template: "RIDE_ASSIGNED" }),
    );
    expect(assignedSvc.live.broadcastRide).toHaveBeenCalledWith(
      expect.objectContaining({
        rideId: "ride-1",
        status: RideStatus.ASSIGNED,
      }),
    );
    expect(assignedSvc.chat.ensureConversation).toHaveBeenCalledWith(
      "ride-1",
      expect.anything(),
      expect.anything(),
    );
    expect(assignedSvc.chat.postSystemMessage).toHaveBeenCalledWith(
      "ride-1",
      "ASSIGNED",
    );

    const suspended = { ...good, status: "SUSPENDED" };
    await expect(
      mk(suspended).assignRide("ride-1", "d-1", "actor"),
    ).rejects.toThrow("not dispatchable");
    const noVehicle = { ...good, assignments: [] };
    await expect(
      mk(noVehicle).assignRide("ride-1", "d-1", "actor"),
    ).rejects.toThrow("no active vehicle");
    const offline = { ...good, isOnline: false };
    await expect(
      mk(offline).assignRide("ride-1", "d-1", "actor"),
    ).rejects.toThrow("is offline");
  });

  it("lets only the assigned driver accept or reject", async () => {
    const mk = (ride: object) =>
      serviceWith({
        ride: {
          findUniqueOrThrow: vi.fn().mockResolvedValue(ride),
          update: vi
            .fn()
            .mockImplementation((a: { data: object }) =>
              Promise.resolve(a.data),
            ),
        },
        driver: {
          findUniqueOrThrow: vi.fn(),
          update: vi
            .fn()
            .mockImplementation((a: { data: object }) =>
              Promise.resolve(a.data),
            ),
        },
        rideEvent: { create: vi.fn().mockResolvedValue({}) },
      });
    const assigned = {
      id: "ride-1",
      status: "ASSIGNED",
      driver: { id: "d-1", userId: "u-driver" },
    };
    const ok = (await mk(assigned).acceptRide("ride-1", "u-driver")) as {
      acceptedAt: unknown;
    };
    expect(ok.acceptedAt).toBeDefined();
    await expect(
      mk(assigned).acceptRide("ride-1", "u-stranger"),
    ).rejects.toThrow("only the assigned driver");

    const rejectSvc = mk(assigned);
    const requeued = (await rejectSvc.rejectRide("ride-1", "u-driver")) as {
      status: string;
    };
    expect(requeued.status).toBe("REQUESTED");
    expect(rejectSvc.chat.deleteConversation).toHaveBeenCalledWith("ride-1");
    await expect(
      mk(assigned).rejectRide("ride-1", "u-stranger"),
    ).rejects.toThrow("only the assigned driver");
  });

  it("lets riders cancel their own rides but not move them", async () => {
    const mk = (user: object, ride: object) =>
      serviceWith({
        ride: {
          findUniqueOrThrow: vi.fn().mockResolvedValue(ride),
          update: vi
            .fn()
            .mockImplementation((a: { data: object }) =>
              Promise.resolve(a.data),
            ),
        },
        user: { findUnique: vi.fn().mockResolvedValue(user) },
        rideEvent: { create: vi.fn().mockResolvedValue({}) },
      });
    const own = {
      id: "ride-1",
      status: "REQUESTED",
      riderId: "u-rider",
      agencyId: null,
    };
    const rider = { id: "u-rider", adminRoles: [], agencyMemberships: [] };
    await mk(rider, own).transitionRide(
      "ride-1",
      RideStatus.CANCELLED,
      "u-rider",
    );
    await expect(
      mk(rider, own).transitionRide("ride-1", RideStatus.ASSIGNED, "u-rider"),
    ).rejects.toThrow("only the assigned driver or staff");
    const stranger = { id: "u-x", adminRoles: [], agencyMemberships: [] };
    await expect(
      mk(stranger, own).transitionRide("ride-1", RideStatus.CANCELLED, "u-x"),
    ).rejects.toThrow(
      "only the rider, the assigned driver, or staff can cancel",
    );
  });
  it("toggles online only for ACTIVE drivers", async () => {
    const mk = (driver: object) =>
      serviceWith({
        driver: {
          findUniqueOrThrow: vi.fn().mockResolvedValue(driver),
          update: vi
            .fn()
            .mockImplementation((a: { data: object }) =>
              Promise.resolve(a.data),
            ),
        },
      });
    const on = (await mk({ id: "d-1", status: "ACTIVE" }).setOnline(
      "u-1",
      true,
    )) as { isOnline: boolean };
    expect(on.isOnline).toBe(true);
    await expect(
      mk({ id: "d-1", status: "SUSPENDED" }).setOnline("u-1", true),
    ).rejects.toThrow("cannot go online");
  });

  it("settles the ledger pair on completion and rejects illegal jumps", async () => {
    const txns: { type: string; amountCentavos: number }[] = [];
    const svc = serviceWith({
      ride: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "ride-1",
          status: "IN_PROGRESS",
          fareCentavos: 19000,
          driverId: "d-1",
        }),
        update: vi
          .fn()
          .mockImplementation((a: { data: object }) => Promise.resolve(a.data)),
      },
      rideEvent: { create: vi.fn().mockResolvedValue({}) },
      ledgerTransaction: {
        create: vi
          .fn()
          .mockImplementation(
            (a: { data: { type: string; amountCentavos: number } }) => {
              txns.push(a.data);
              return Promise.resolve(a.data);
            },
          ),
      },
      wallet: {
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValueOnce({ id: "w-driver", balanceCentavos: 1000 })
          .mockResolvedValueOnce({ id: "w-platform", balanceCentavos: 5000 }),
        update: vi
          .fn()
          .mockImplementation((a: { data: object }) => Promise.resolve(a.data)),
      },
    });
    await svc.transitionRide("ride-1", RideStatus.COMPLETED, "actor");
    const earning = txns.find((t) => t.type === "RIDE_EARNING")!;
    const commission = txns.find((t) => t.type === "COMMISSION")!;
    expect(earning.amountCentavos + commission.amountCentavos).toBe(19000);
    expect(svc.sent.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ template: "RIDE_COMPLETED" }),
    );

    await expect(
      svc.transitionRide("ride-1", RideStatus.ASSIGNED, "actor"),
    ).rejects.toThrow("Illegal ride transition");
  });

  it("quotes fares from real coordinates", async () => {
    const svc = serviceWith({});
    const quote = await svc.quoteFare(
      { lat: 10.3181, lng: 123.9054 },
      { lat: 10.3111, lng: 123.9185 },
      "SEDAN",
    );
    expect(quote.provider).toBe("haversine");
    expect(quote.fareCentavos).toBeGreaterThanOrEqual(6000);
    expect(quote.distanceKm).toBeGreaterThan(0);
  });

  it("lists my rides as rider and as driver", async () => {
    const svc = serviceWith({
      driver: { findUnique: vi.fn().mockResolvedValue({ id: "d-1" }) },
      ride: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([{ id: "r-rider" }])
          .mockResolvedValueOnce([{ id: "r-driver" }]),
      },
    });
    const mine = (await svc.myRides("u-1")) as {
      asRider: { id: string }[];
      asDriver: { id: string }[];
    };
    expect(mine.asRider.map((r) => r.id)).toEqual(["r-rider"]);
    expect(mine.asDriver.map((r) => r.id)).toEqual(["r-driver"]);
  });
});
