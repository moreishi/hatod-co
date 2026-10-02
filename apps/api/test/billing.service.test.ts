import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { BillingService } from "../src/billing/billing.service.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";

const schedule = (over: object = {}) => ({
  id: "fs-1",
  name: "pilot",
  currency: "PHP",
  baseFareCentavos: 4000,
  minimumFareCentavos: 6000,
  perKmCentavos: {
    MOTORCYCLE: 800,
    SEDAN: 1500,
    SUV: 1800,
    VAN: 2200,
    TAXI: 1500,
    CAR_4SEATER: 1600,
    CAR_6SEATER: 2000,
    TRUCK_600KG: 2500,
    TRUCK_600KG_MOVER: 3000,
    TRUCK_1000KG: 3500,
    TRUCK_2000KG: 4500,
  },
  commissionTiers: [{ minLifetimeRides: 0, rateBps: 2000 }],
  isActive: true,
  createdBy: "u-adm",
  createdAt: new Date(),
  ...over,
});

function serviceWith(db: Record<string, unknown>) {
  const prisma = {
    ...db,
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
  } as unknown as PrismaService;
  return new BillingService(prisma);
}

describe("BillingService fares", () => {
  it("serves the active schedule, cached between publishes", async () => {
    const findFirst = vi.fn().mockResolvedValue(schedule());
    const svc = serviceWith({ fareSchedule: { findFirst } });
    const a = await svc.getPricing();
    const b = await svc.getPricing();
    expect(a.baseFareCentavos).toBe(4000);
    expect(a.perKmCentavos["TAXI"]).toBe(1500);
    expect(findFirst).toHaveBeenCalledTimes(1);
    expect(b).toBe(a);
  });

  it("publishes a validated schedule, deactivates the old, audits", async () => {
    const calls: Record<string, unknown>[] = [];
    const auditCreate = vi.fn().mockResolvedValue({});
    const svc = serviceWith({
      fareSchedule: {
        findFirst: vi.fn().mockResolvedValue(schedule()),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn().mockImplementation((a: { data: object }) => {
          calls.push(a.data as Record<string, unknown>);
          return Promise.resolve({ id: "fs-2", ...(a.data as object) });
        }),
      },
      auditLog: { create: auditCreate },
    });
    const out = (await svc.publish(
      {
        name: "promo",
        baseFareCentavos: 3000,
        minimumFareCentavos: 5000,
        perKmCentavos: schedule().perKmCentavos as Record<string, number>,
        commissionTiers: [{ minLifetimeRides: 0, rateBps: 1000 }],
      },
      "u-adm",
    )) as { id: string; isActive: boolean };
    expect(out.id).toBe("fs-2");
    expect(out.isActive).toBe(true);
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: "u-adm",
          action: "fare.publish",
          entity: "FareSchedule",
        }),
      }),
    );
    // Cache cleared: next read hits the database again.
    await svc.getPricing();
    const fresh = serviceWith({
      fareSchedule: {
        findFirst: vi
          .fn()
          .mockResolvedValue(schedule({ id: "fs-2", baseFareCentavos: 3000 })),
      },
    });
    expect((await fresh.getPricing()).baseFareCentavos).toBe(3000);
  });

  it("rejects incomplete or absurd schedules", async () => {
    const svc = serviceWith({
      fareSchedule: { findFirst: vi.fn() },
      auditLog: { create: vi.fn() },
    });
    const badMap = { ...(schedule().perKmCentavos as object) } as Record<
      string,
      number
    >;
    delete badMap["TAXI"];
    await expect(
      svc.publish(
        {
          name: "bad",
          baseFareCentavos: 4000,
          minimumFareCentavos: 6000,
          perKmCentavos: badMap,
          commissionTiers: [{ minLifetimeRides: 0, rateBps: 2000 }],
        },
        "u-adm",
      ),
    ).rejects.toThrowError(BadRequestException);
    await expect(
      svc.publish(
        {
          name: "bad",
          baseFareCentavos: -5,
          minimumFareCentavos: 6000,
          perKmCentavos: schedule().perKmCentavos as Record<string, number>,
          commissionTiers: [{ minLifetimeRides: 0, rateBps: 2000 }],
        },
        "u-adm",
      ),
    ).rejects.toThrowError(BadRequestException);
  });
});
