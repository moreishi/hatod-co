import { describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { NotificationsService } from "../src/notifications/notifications.service.js";

describe("NotificationsService outbox (spec §47)", () => {
  it("enqueues a QUEUED row with the rendered template and payload", async () => {
    const create = vi
      .fn()
      .mockImplementation((a: { data: object }) =>
        Promise.resolve({ id: "n-1", ...a.data }),
      );
    const svc = new NotificationsService({
      notification: { create },
    } as unknown as PrismaService);
    const row = (await svc.enqueue({
      userId: "u-1",
      channel: "SMS",
      to: "09170000001",
      template: "OTP_CODE",
      variables: { code: "123456" },
    })) as { status: string; template: string; payload: string };
    expect(row.status).toBe("QUEUED");
    expect(row.template).toContain("{{code}}");
    expect(JSON.parse(row.payload)).toMatchObject({ to: "09170000001" });
  });

  it("lists a user's notifications newest-first", async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: "n-1" }]);
    const svc = new NotificationsService({
      notification: { findMany },
    } as unknown as PrismaService);
    expect(await svc.listMine("u-1")).toHaveLength(1);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u-1" } }),
    );
  });
});
