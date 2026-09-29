import { describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { OnboardingService } from "../src/onboarding/onboarding.service.js";

function serviceWith(db: Record<string, unknown>) {
  const prisma = {
    ...db,
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
  } as unknown as PrismaService;
  const notifications = { enqueue: vi.fn().mockResolvedValue({}) };
  const service = new OnboardingService(prisma, notifications as never);
  return Object.assign(service, { sent: notifications });
}

describe("OnboardingService (spec §21-§24)", () => {
  it("creates APPLICANT drivers with a zero wallet, once per user", async () => {
    const svc = serviceWith({
      driver: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi
          .fn()
          .mockImplementation((a: { data: object }) =>
            Promise.resolve({ id: "d-1", ...a.data }),
          ),
      },
      wallet: { create: vi.fn().mockResolvedValue({}) },
    });
    const driver = (await svc.applyDriver("u-1", {
      agencyId: "ag-1",
      licenseNo: "L123",
    })) as { status: string };
    expect(driver.status).toBe("APPLICANT");

    const dupe = serviceWith({
      driver: { findUnique: vi.fn().mockResolvedValue({ id: "d-1" }) },
      wallet: { create: vi.fn() },
    });
    await expect(
      dupe.applyDriver("u-1", { agencyId: "ag-1", licenseNo: "L123" }),
    ).rejects.toThrow("already has a driver profile");
  });

  it("lets owners and staff upload, and moves APPLICANT to DOCUMENTS_PENDING", async () => {
    const update = vi
      .fn()
      .mockImplementation((a: { data: object }) => Promise.resolve(a.data));
    const svc = serviceWith({
      driver: {
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValue({ id: "d-1", userId: "u-1", status: "APPLICANT" }),
        update,
      },
      document: { create: vi.fn().mockResolvedValue({ id: "doc-1" }) },
    });
    await svc.submitDocument(
      "d-1",
      { type: "DRIVERS_LICENSE", storageKey: "k" },
      { sub: "u-1", roles: ["RIDER"] },
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "DOCUMENTS_PENDING" } }),
    );
    await svc.submitDocument(
      "d-1",
      { type: "OR_CR", storageKey: "k" },
      { sub: "staff-1", roles: ["AGENCY:ag-1:OWNER"] },
    );
    await expect(
      svc.submitDocument(
        "d-1",
        { type: "X", storageKey: "k" },
        { sub: "u-9", roles: ["RIDER"] },
      ),
    ).rejects.toThrow("not your driver profile");
  });

  it("rejects uploads once the driver leaves the intake states", async () => {
    const active = serviceWith({
      driver: {
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValue({ id: "d-1", userId: "u-1", status: "ACTIVE" }),
      },
      document: { create: vi.fn() },
    });
    await expect(
      active.submitDocument(
        "d-1",
        { type: "X", storageKey: "k" },
        { sub: "u-1", roles: ["RIDER"] },
      ),
    ).rejects.toThrow("cannot submit documents while driver is ACTIVE");
  });

  it("approves only with all required documents verified", async () => {
    const mk = (docs: { type: string; status: string }[]) =>
      serviceWith({
        driver: {
          findUniqueOrThrow: vi
            .fn()
            .mockResolvedValue({ id: "d-1", status: "DOCUMENTS_UNDER_REVIEW" }),
          findUnique: vi.fn().mockResolvedValue({
            id: "d-1",
            user: { id: "u-1", phone: "09170000001" },
          }),
          update: vi
            .fn()
            .mockImplementation((a: { data: object }) =>
              Promise.resolve(a.data),
            ),
        },
        document: { findMany: vi.fn().mockResolvedValue(docs) },
        auditLog: { create: vi.fn().mockResolvedValue({}) },
      });
    await expect(mk([]).reviewDriver("d-1", "approve", "rev")).rejects.toThrow(
      "missing verified documents",
    );
    const okSvc = mk([
      { type: "DRIVERS_LICENSE", status: "VERIFIED" },
      { type: "OR_CR", status: "VERIFIED" },
      { type: "NBI_CLEARANCE", status: "VERIFIED" },
    ]);
    const ok = (await okSvc.reviewDriver("d-1", "approve", "rev")) as {
      status: string;
    };
    expect(ok.status).toBe("ACTIVE");
    expect(okSvc.sent.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ template: "DRIVER_APPROVED" }),
    );
  });

  it("walks start-review and reject along legal states", async () => {
    const mk = (status: string) =>
      serviceWith({
        driver: {
          findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "d-1", status }),
          update: vi
            .fn()
            .mockImplementation((a: { data: object }) =>
              Promise.resolve(a.data),
            ),
        },
        document: { findMany: vi.fn().mockResolvedValue([]) },
        auditLog: { create: vi.fn().mockResolvedValue({}) },
      });
    const under = (await mk("DOCUMENTS_PENDING").reviewDriver(
      "d-1",
      "start-review",
      "rev",
    )) as { status: string };
    expect(under.status).toBe("DOCUMENTS_UNDER_REVIEW");
    await expect(
      mk("APPLICANT").reviewDriver("d-1", "start-review", "rev"),
    ).rejects.toThrow("cannot start review");
    const rejected = (await mk("DOCUMENTS_UNDER_REVIEW").reviewDriver(
      "d-1",
      "reject",
      "rev",
    )) as { status: string };
    expect(rejected.status).toBe("REJECTED");
  });

  it("only accepts VERIFIED/REJECTED verdicts on documents", async () => {
    const svc = serviceWith({
      document: {
        update: vi
          .fn()
          .mockImplementation((a: { data: object }) => Promise.resolve(a.data)),
      },
    });
    await expect(
      svc.verifyDocument("doc-1", "PENDING" as never, "rev"),
    ).rejects.toThrow("cannot set document");
    await svc.verifyDocument("doc-1", "VERIFIED", "rev");
  });
});
