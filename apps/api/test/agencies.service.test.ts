import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AgenciesService } from "../src/agencies/agencies.service.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import type { Requester } from "../src/onboarding/onboarding.service.js";

function serviceWith(db: Record<string, unknown>, location?: object) {
  const prisma = {
    ...db,
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
  } as unknown as PrismaService;
  return new AgenciesService(
    prisma,
    (location ?? { nearby: vi.fn().mockResolvedValue([]) }) as never,
  );
}

const owner: Requester = {
  sub: "u-owner",
  roles: ["AGENCY:ag-1:OWNER", "RIDER"],
};
const dispatcher: Requester = {
  sub: "u-disp",
  roles: ["AGENCY:ag-1:DISPATCHER", "RIDER"],
};
const outsider: Requester = {
  sub: "u-out",
  roles: ["AGENCY:ag-2:OWNER", "RIDER"],
};
const admin: Requester = { sub: "u-adm", roles: ["ADMIN:OPS", "RIDER"] };

describe("AgenciesService (spec §17, §18)", () => {
  it("scopes myAgencies to membership, admins see all", async () => {
    const svc = serviceWith({
      agency: {
        findMany: vi
          .fn()
          .mockImplementation((a?: { where?: object }) =>
            Promise.resolve(
              a?.where ? [{ id: "ag-1" }] : [{ id: "ag-1" }, { id: "ag-2" }],
            ),
          ),
      },
    });
    expect(await svc.myAgencies(owner)).toHaveLength(1);
    expect(await svc.myAgencies(admin)).toHaveLength(2);
  });

  it("creates agencies with a wallet, slug, and guards", async () => {
    const created: Record<string, unknown>[] = [];
    const svc = serviceWith({
      agency: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation((a: { data: object }) => {
          created.push(a.data as Record<string, unknown>);
          return Promise.resolve({ id: "ag-9", ...(a.data as object) });
        }),
      },
      wallet: { create: vi.fn().mockResolvedValue({ id: "w-9" }) },
    });
    const agency = (await svc.createAgency({
      name: "South Wheels",
      cityCode: "072217000",
      contactPhone: "09170000999",
    })) as { id: string; slug: string; status: string };
    expect(agency.id).toBe("ag-9");
    expect(agency.slug).toBe("south-wheels");
    expect(agency.status).toBe("ACTIVE");
    expect(created[0]).toMatchObject({ name: "South Wheels" });
  });

  it("rejects duplicate slugs and blank names", async () => {
    const svc = serviceWith({
      agency: {
        findUnique: vi.fn().mockResolvedValue({ id: "ag-1" }),
        create: vi.fn(),
      },
      wallet: { create: vi.fn() },
    });
    await expect(
      svc.createAgency({
        name: "South Wheels",
        cityCode: "072217000",
        contactPhone: "09170000999",
      }),
    ).rejects.toThrowError(ConflictException);
    const fresh = serviceWith({
      agency: { findUnique: vi.fn(), create: vi.fn() },
      wallet: { create: vi.fn() },
    });
    await expect(
      fresh.createAgency({ name: "  ", cityCode: "", contactPhone: "" }),
    ).rejects.toThrowError(BadRequestException);
  });

  it("updates contact, city, and status", async () => {
    const update = vi
      .fn()
      .mockImplementation((a: { data: object }) =>
        Promise.resolve({ id: "ag-1", ...a.data }),
      );
    const svc = serviceWith({
      agency: {
        findUnique: vi.fn().mockResolvedValue({ id: "ag-1" }),
        update,
      },
      wallet: { create: vi.fn() },
    });
    const out = (await svc.updateAgency("ag-1", {
      contactPhone: "09170000999",
      status: "SUSPENDED",
    })) as Record<string, unknown>;
    expect(out["status"]).toBe("SUSPENDED");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ag-1" },
        data: expect.objectContaining({ contactPhone: "09170000999" }),
      }),
    );
    const missing = serviceWith({
      agency: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
      wallet: { create: vi.fn() },
    });
    await expect(
      missing.updateAgency("ag-9", { contactPhone: "09170000999" }),
    ).rejects.toThrowError(NotFoundException);
    await expect(
      svc.updateAgency("ag-1", { status: "WEIRD" }),
    ).rejects.toThrowError(BadRequestException);
  });

  it("lists active agencies for the onboarding picker", async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: "ag-1" }]);
    const svc = serviceWith({ agency: { findMany } });
    expect(await svc.listActive()).toEqual([{ id: "ag-1" }]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "ACTIVE" }),
      }),
    );
  });

  it("lists fleet and the compliance queue scoped to the agency", async () => {
    const svc = serviceWith({
      driver: { findMany: vi.fn().mockResolvedValue([{ id: "d-1" }]) },
      vehicle: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([{ id: "v-1" }])
          .mockResolvedValueOnce([{ id: "v-1" }]),
      },
      document: { findMany: vi.fn().mockResolvedValue([{ id: "doc-1" }]) },
    });
    expect(await svc.listVehicles("ag-1", owner)).toHaveLength(1);
    expect(await svc.listDocuments("ag-1", "PENDING", owner)).toHaveLength(1);
    await expect(svc.listVehicles("ag-1", outsider)).rejects.toThrow(
      "not a member of this agency",
    );
    await expect(
      svc.listDocuments("ag-1", undefined, outsider),
    ).rejects.toThrow("not a member of this agency");
  });

  it("searches documents by driver, phone, or type with paging", async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: "doc-1" }]);
    const svc = serviceWith({
      driver: { findMany: vi.fn().mockResolvedValue([{ id: "d-1" }]) },
      vehicle: { findMany: vi.fn().mockResolvedValue([]) },
      document: { findMany },
    });
    const out = await svc.listDocuments("ag-1", undefined, owner, {
      search: "santos",
      take: 20,
      skip: 20,
    });
    expect(out).toHaveLength(1);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20, skip: 20 }),
    );
    const where = findMany.mock.calls[0][0].where;
    expect(JSON.stringify(where).toLowerCase()).toContain("santos");
  });

  it("scopes ride lists to the agency", async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: "ride-1" }]);
    const svc = serviceWith({ ride: { findMany } });
    await svc.listRides("ag-1", ["REQUESTED", "ASSIGNED"], owner);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { agencyId: "ag-1", status: { in: ["REQUESTED", "ASSIGNED"] } },
      }),
    );
    await expect(svc.listRides("ag-1", undefined, outsider)).rejects.toThrow(
      "not a member of this agency",
    );
  });

  it("blocks outsiders from another agency's drivers", async () => {
    const svc = serviceWith({
      driver: { findMany: vi.fn().mockResolvedValue([]) },
    });
    await svc.listDrivers("ag-1", owner);
    await expect(svc.listDrivers("ag-1", outsider)).rejects.toThrow(
      "not a member of this agency",
    );
  });

  it("attaches documents to the driver list for progress display", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const svc = serviceWith({ driver: { findMany } });
    await svc.listDrivers("ag-1", owner);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({ documents: expect.anything() }),
      }),
    );
  });

  it("restricts vehicle creation to owner/manager with unique plates", async () => {
    const mk = (plate: string | null) =>
      serviceWith({
        vehicle: {
          findUnique: vi
            .fn()
            .mockResolvedValue(plate ? { plateNo: plate } : null),
          create: vi
            .fn()
            .mockImplementation((a: { data: object }) =>
              Promise.resolve(a.data),
            ),
        },
      });
    await mk(null).createVehicle(
      "ag-1",
      { plateNo: "NEW1", type: "SEDAN" },
      owner,
    );
    await expect(
      mk(null).createVehicle(
        "ag-1",
        { plateNo: "NEW1", type: "SEDAN" },
        dispatcher,
      ),
    ).rejects.toThrow("role cannot perform this action");
    await expect(
      mk("DUP1").createVehicle(
        "ag-1",
        { plateNo: "DUP1", type: "SEDAN" },
        owner,
      ),
    ).rejects.toThrow("already registered");
  });

  it("reassigns vehicles preserving history, same agency only", async () => {
    const mk = (driver: object, vehicle: object) =>
      serviceWith({
        driver: { findUniqueOrThrow: vi.fn().mockResolvedValue(driver) },
        vehicle: { findUniqueOrThrow: vi.fn().mockResolvedValue(vehicle) },
        driverVehicleAssignment: {
          findFirst: vi.fn().mockResolvedValue({ id: "old-assign" }),
          update: vi.fn().mockResolvedValue({}),
          create: vi
            .fn()
            .mockImplementation((a: { data: object }) =>
              Promise.resolve(a.data),
            ),
        },
      });
    const active = { id: "d-1", agencyId: "ag-1", status: "ACTIVE" };
    const sameAgency = { id: "v-2", agencyId: "ag-1" };
    const res = (await mk(active, sameAgency).assignVehicle(
      "d-1",
      "v-2",
      dispatcher,
    )) as {
      vehicleId: string;
    };
    expect(res.vehicleId).toBe("v-2");

    const otherAgency = { id: "v-9", agencyId: "ag-2" };
    await expect(
      mk(active, otherAgency).assignVehicle("d-1", "v-9", dispatcher),
    ).rejects.toThrow("another agency");
    const suspended = { ...active, status: "SUSPENDED" };
    await expect(
      mk(suspended, sameAgency).assignVehicle("d-1", "v-2", dispatcher),
    ).rejects.toThrow("not dispatchable");
  });
});
