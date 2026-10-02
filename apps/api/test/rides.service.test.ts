import { describe, expect, it, vi } from "vitest";
import { RideStatus } from "@hailing/constants";
import { pricing as staticPricing } from "@hailing/data";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { quoteAllFares, quoteFare } from "../src/rides/fare.js";
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

  it("prices the expanded fleet off the pricing table", () => {
    expect(
      quoteFare({ vehicleType: "TAXI", distanceKm: 10 }).fareCentavos,
    ).toBe(4000 + 10 * 1500);
    expect(
      quoteFare({ vehicleType: "CAR_4SEATER", distanceKm: 10 }).fareCentavos,
    ).toBe(4000 + 10 * 1600);
    expect(
      quoteFare({ vehicleType: "CAR_6SEATER", distanceKm: 10 }).fareCentavos,
    ).toBe(4000 + 10 * 2000);
    expect(
      quoteFare({ vehicleType: "TRUCK_600KG", distanceKm: 10 }).fareCentavos,
    ).toBe(4000 + 10 * 2500);
    expect(
      quoteFare({ vehicleType: "TRUCK_600KG_MOVER", distanceKm: 10 })
        .fareCentavos,
    ).toBe(4000 + 10 * 3000);
    expect(
      quoteFare({ vehicleType: "TRUCK_1000KG", distanceKm: 10 }).fareCentavos,
    ).toBe(4000 + 10 * 3500);
    expect(
      quoteFare({ vehicleType: "TRUCK_2000KG", distanceKm: 10 }).fareCentavos,
    ).toBe(4000 + 10 * 4500);
  });

  it("quotes every fleet type off one distance", () => {
    const fares = quoteAllFares({ distanceKm: 10 });
    const types = [
      "MOTORCYCLE",
      "SEDAN",
      "SUV",
      "VAN",
      "TAXI",
      "CAR_4SEATER",
      "CAR_6SEATER",
      "TRUCK_600KG",
      "TRUCK_600KG_MOVER",
      "TRUCK_1000KG",
      "TRUCK_2000KG",
    ] as const;
    expect(Object.keys(fares).sort()).toEqual([...types].sort());
    for (const vehicleType of types) {
      expect(fares[vehicleType]).toBe(
        quoteFare({ vehicleType, distanceKm: 10 }).fareCentavos,
      );
    }
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
  const matching = {
    matchRide: vi.fn().mockResolvedValue(null),
    cancelOffers: vi.fn(),
  };
  const billing = {
    getPricing: vi.fn().mockResolvedValue({
      baseFareCentavos: staticPricing.baseFareCentavos,
      minimumFareCentavos: staticPricing.minimumFareCentavos,
      perKmCentavos: { ...staticPricing.perKmCentavos },
      commissionTiers: staticPricing.commissionTiers.map((t) => ({
        rateBps: t.rateBps,
      })),
    }),
  };
  const service = new RidesService(
    prisma,
    new RideTransitionGuard(),
    notifications as never,
    realtime as never,
    messaging as never,
    matching as never,
    billing as never,
  );
  return Object.assign(service, {
    sent: notifications,
    live: realtime,
    chat: messaging,
    match: matching,
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

  it("persists booking extras: tip, change-for, rider note", async () => {
    const create = vi
      .fn()
      .mockImplementation((args: { data: object }) =>
        Promise.resolve(args.data),
      );
    const svc = serviceWith({ ride: { create } });
    const ride = (await svc.requestRide("rider-1", {
      ...dto,
      tipCentavos: 2000,
      changeFor: 100000,
      riderNote: "Gate 2, blue house",
    })) as {
      tipCentavos: number;
      changeFor: number;
      riderNote: string;
    };
    expect(ride.tipCentavos).toBe(2000);
    expect(ride.changeFor).toBe(100000);
    expect(ride.riderNote).toBe("Gate 2, blue house");
  });

  it("books with E-Wallet and rejects unknown methods", async () => {
    const create = vi
      .fn()
      .mockImplementation((args: { data: object }) =>
        Promise.resolve(args.data),
      );
    const svc = serviceWith({ ride: { create } });
    const ride = (await svc.requestRide("rider-1", {
      ...dto,
      paymentMethod: "WALLET",
    })) as { paymentMethod: string };
    expect(ride.paymentMethod).toBe("WALLET");
    await expect(
      svc.requestRide("rider-1", {
        ...dto,
        paymentMethod: "BARTER" as never,
      }),
    ).rejects.toThrow("invalid payment method");
  });

  it("rejects negative tips and overlong notes", async () => {
    const svc = serviceWith({ ride: { create: vi.fn() } });
    await expect(
      svc.requestRide("rider-1", { ...dto, tipCentavos: -100 }),
    ).rejects.toThrow("invalid tip");
    await expect(
      svc.requestRide("rider-1", { ...dto, riderNote: "x".repeat(141) }),
    ).rejects.toThrow("note too long");
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
    process.env.ROUTING_PROVIDER = "haversine";
    const svc = serviceWith({});
    delete process.env.ROUTING_PROVIDER;
    const quote = await svc.quoteFare(
      { lat: 10.3181, lng: 123.9054 },
      { lat: 10.3111, lng: 123.9185 },
      "SEDAN",
    );
    expect(quote.provider).toBe("haversine");
    expect(quote.fareCentavos).toBeGreaterThanOrEqual(6000);
    expect(quote.distanceKm).toBeGreaterThan(0);
  });

  it("returns every fleet fare off the single route", async () => {
    process.env.ROUTING_PROVIDER = "haversine";
    const svc = serviceWith({});
    delete process.env.ROUTING_PROVIDER;
    const quote = await svc.quoteFare(
      { lat: 10.3181, lng: 123.9054 },
      { lat: 10.3111, lng: 123.9185 },
      "SEDAN",
    );
    expect(quote.fares["SEDAN"]).toBe(quote.fareCentavos);
    expect(quote.fares["TAXI"]).toBe(
      quoteFare({ vehicleType: "TAXI", distanceKm: quote.distanceKm })
        .fareCentavos,
    );
    expect(quote.fares["TRUCK_2000KG"]).toBe(
      quoteFare({ vehicleType: "TRUCK_2000KG", distanceKm: quote.distanceKm })
        .fareCentavos,
    );
    expect(Object.keys(quote.fares)).toHaveLength(11);
  });

  it("shares the assigned driver location with its rider", async () => {
    const ping = {
      lat: 10.39,
      lng: 123.97,
      recordedAt: new Date(),
    };
    const svc = serviceWith({
      ride: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "ride-1",
          riderId: "u-1",
          driverId: "d-1",
        }),
      },
      locationPing: { findFirst: vi.fn().mockResolvedValue(ping) },
    });
    const loc = await svc.driverLocation("ride-1", "u-1");
    expect(loc).toMatchObject({ lat: 10.39, lng: 123.97 });
    expect(loc?.ageSec).toBeGreaterThanOrEqual(0);
  });

  it("hides driver location from strangers and when unassigned", async () => {
    const svc = serviceWith({
      ride: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "ride-1",
          riderId: "u-1",
          driverId: null,
        }),
      },
      locationPing: { findFirst: vi.fn() },
    });
    await expect(svc.driverLocation("ride-1", "u-2")).rejects.toThrow();
    await expect(svc.driverLocation("ride-1", "u-1")).rejects.toThrow();
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

  it("includes the active vehicle on driver rides", async () => {
    const findMany = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const svc = serviceWith({
      driver: { findUnique: vi.fn().mockResolvedValue({ id: "d-1" }) },
      ride: { findMany },
    });
    await svc.myRides("u-1");
    expect(findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        include: expect.objectContaining({ driver: expect.anything() }),
      }),
    );
  });

  it("returns driver earnings from wallet ledger", async () => {
    const svc = serviceWith({
      driver: {
        findUnique: vi.fn().mockResolvedValue({ id: "d-1" }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "d-1" }),
      },
      wallet: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: "w-1", balanceCentavos: 12500 }),
      },
      ledgerTransaction: {
        findMany: vi.fn().mockResolvedValue([
          { id: "t-1", type: "RIDE_EARNING", amountCentavos: 8000 },
          { id: "t-2", type: "RIDE_EARNING", amountCentavos: 4500 },
        ]),
      },
    });
    const earnings = (await svc.driverEarnings("u-1")) as {
      balanceCentavos: number;
      totalCentavos: number;
      tripCount: number;
    };
    expect(earnings.balanceCentavos).toBe(12500);
    expect(earnings.totalCentavos).toBe(12500);
    expect(earnings.tripCount).toBe(2);
  });

  it("includes driver displayName in ride detail", async () => {
    const findUniqueOrThrow = vi.fn().mockResolvedValue({
      id: "ride-1",
      driver: { user: { displayName: "D" } },
    });
    const svc = serviceWith({
      ride: { findUniqueOrThrow },
    });
    await svc.getRide("ride-1");
    expect(findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          driver: expect.anything(),
        }),
      }),
    );
  });
});
