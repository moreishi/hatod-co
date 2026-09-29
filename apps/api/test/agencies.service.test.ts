import { describe, expect, it, vi } from "vitest";
import { AgenciesService } from "../src/agencies/agencies.service.js";
import type { PrismaService } from "../src/auth/prisma.service.js";
import type { Requester } from "../src/onboarding/onboarding.service.js";

function serviceWith(db: Record<string, unknown>) {
  const prisma = {
    ...db,
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
  } as unknown as PrismaService;
  return new AgenciesService(prisma);
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
