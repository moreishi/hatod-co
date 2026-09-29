import { describe, expect, it, vi } from "vitest";
import { AdminService } from "../src/admin/admin.service.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";

function serviceWith(db: Record<string, unknown>) {
  return new AdminService(db as unknown as PrismaService);
}

describe("AdminService invitations (spec §16)", () => {
  it("issues a tokened invitation and lists pending ones", async () => {
    const create = vi
      .fn()
      .mockImplementation((a: { data: object }) =>
        Promise.resolve({ id: "inv-1", ...a.data }),
      );
    const svc = serviceWith({
      adminInvitation: {
        create,
        findMany: vi.fn().mockResolvedValue([{ id: "inv-1" }]),
      },
    });
    const inv = (await svc.invite(
      { email: "ops@example.com", role: "OPS" },
      "super-1",
    )) as {
      token: string;
    };
    expect(inv.token.length).toBeGreaterThan(20);
    expect(await svc.listInvitations()).toHaveLength(1);
    await expect(
      svc.invite({ email: "x@example.com", role: "NOPE" as never }, "super-1"),
    ).rejects.toThrow("unknown admin role");
  });

  it("accepts a valid invitation by creating the admin user", async () => {
    const svc = serviceWith({
      adminInvitation: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "inv-1",
          email: "ops@example.com",
          role: "OPS",
          acceptedAt: null,
          expiresAt: new Date(Date.now() + 3600_000),
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi
          .fn()
          .mockImplementation((a: { data: object }) =>
            Promise.resolve({ id: "u-9", ...a.data }),
          ),
      },
      adminRoleAssignment: { create: vi.fn().mockResolvedValue({}) },
    });
    const res = await svc.accept("tok", {
      phone: "09179990001",
      password: "s3cret!!",
    });
    expect(res).toMatchObject({ userId: "u-9", role: "OPS" });
  });

  it("lists rides, transactions, and a finance summary", async () => {
    const svc = serviceWith({
      ride: { findMany: vi.fn().mockResolvedValue([{ id: "ride-1" }]) },
      ledgerTransaction: {
        findMany: vi.fn().mockResolvedValue([{ id: "tx-1" }]),
        groupBy: vi.fn().mockResolvedValue([
          {
            type: "RIDE_EARNING",
            _sum: { amountCentavos: 100 },
            _count: { type: 2 },
          },
        ]),
      },
      wallet: { count: vi.fn().mockResolvedValue(23) },
    });
    expect(await svc.listRides("COMPLETED")).toHaveLength(1);
    expect(await svc.listTransactions(undefined)).toHaveLength(1);
    expect(await svc.financeSummary()).toMatchObject({ wallets: 23 });
  });

  it("rejects used, expired, weak, and duplicate accepts", async () => {
    const mk = (inv: object) =>
      serviceWith({
        adminInvitation: {
          findUniqueOrThrow: vi.fn().mockResolvedValue(inv),
          update: vi.fn(),
        },
        user: { findUnique: vi.fn().mockResolvedValue({ id: "taken" }) },
        adminRoleAssignment: { create: vi.fn() },
      });
    const fresh = {
      id: "inv-1",
      email: "a@x.com",
      role: "OPS",
      acceptedAt: null,
      expiresAt: new Date(Date.now() + 3600_000),
    };
    await expect(
      mk({ ...fresh, acceptedAt: new Date() }).accept("t", {
        phone: "09170000001",
        password: "s3cret!!",
      }),
    ).rejects.toThrow("already used");
    await expect(
      mk({ ...fresh, expiresAt: new Date(Date.now() - 1000) }).accept("t", {
        phone: "09170000001",
        password: "s3cret!!",
      }),
    ).rejects.toThrow("expired");
    await expect(
      mk(fresh).accept("t", { phone: "09170000001", password: "short" }),
    ).rejects.toThrow("at least 8 characters");
    await expect(
      mk(fresh).accept("t", { phone: "09170000001", password: "s3cret!!" }),
    ).rejects.toThrow("already registered");
  });
});
