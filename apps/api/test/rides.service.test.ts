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
      findUnique: vi
        .fn()
        .mockResolvedValue({ id: "rider-1", phone: "09170000001" }),
      ...(typeof db.user === "object" && db.user !== null ? db.user : {}),
    },
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
  } as unknown as PrismaService;
  const notifications = { enqueue: vi.fn().mockResolvedValue({}) };
  const realtime = { broadcastRide: vi.fn() };
  const service = new RidesService(
    prisma,
    new RideTransitionGuard(),
    notifications as never,
    realtime as never,
  );
  return Object.assign(service, { sent: notifications, live: realtime });
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
          findUniqueOrThrow: vi
            .fn()
            .mockResolvedValue({ id: "ride-1", status: "REQUESTED" }),
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

    const suspended = { ...good, status: "SUSPENDED" };
    await expect(
      mk(suspended).assignRide("ride-1", "d-1", "actor"),
    ).rejects.toThrow("not dispatchable");
    const noVehicle = { ...good, assignments: [] };
    await expect(
      mk(noVehicle).assignRide("ride-1", "d-1", "actor"),
    ).rejects.toThrow("no active vehicle");
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
});
