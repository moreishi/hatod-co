import { describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { MessagingService } from "../src/messaging/messaging.service.js";

const convo = (overrides: object = {}) => ({
  id: "c-1",
  rideId: "ride-1",
  riderId: "rider-1",
  driverId: "driver-1",
  status: "ACTIVE",
  ...overrides,
});

function serviceWith(db: Record<string, unknown>) {
  const prisma = {
    conversation: {
      findUnique: vi.fn().mockResolvedValue(convo()),
      findUniqueOrThrow: vi.fn().mockResolvedValue(convo()),
      create: vi
        .fn()
        .mockImplementation((a: { data: object }) =>
          Promise.resolve({ id: "c-1", ...a.data }),
        ),
      update: vi
        .fn()
        .mockImplementation((a: { data: object }) => Promise.resolve(a.data)),
      findMany: vi.fn().mockResolvedValue([]),
    },
    message: {
      create: vi
        .fn()
        .mockImplementation((a: { data: object }) =>
          Promise.resolve({ id: "m-1", createdAt: new Date(), ...a.data }),
        ),
      findUnique: vi.fn().mockResolvedValue(null),
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        id: "m-0",
        conversationId: "c-1",
        createdAt: new Date(),
      }),
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn().mockResolvedValue({ count: 2 }),
      count: vi.fn().mockResolvedValue(3),
    },
    ...db,
  } as unknown as PrismaService;
  const notifications = { enqueue: vi.fn().mockResolvedValue({}) };
  const realtime = {
    broadcastConversation: vi.fn(),
    isViewing: vi.fn().mockReturnValue(true),
  };
  const service = new MessagingService(
    prisma,
    notifications as never,
    realtime as never,
  );
  return Object.assign(service, {
    sent: notifications,
    live: realtime,
    db: prisma,
  });
}

describe("MessagingService lifecycle (spec §3–§5)", () => {
  it("creates one ACTIVE conversation per ride, idempotently", async () => {
    const fresh = serviceWith({
      conversation: {
        findUnique: vi.fn().mockResolvedValue(null),
        findUniqueOrThrow: vi.fn().mockResolvedValue(convo()),
        create: vi
          .fn()
          .mockImplementation((a: { data: object }) =>
            Promise.resolve({ id: "c-1", ...a.data }),
          ),
        update: vi.fn().mockResolvedValue({}),
        findMany: vi.fn().mockResolvedValue([]),
      },
    });
    const first = (await fresh.ensureConversation(
      "ride-1",
      "rider-1",
      "driver-1",
    )) as { status: string };
    expect(first.status).toBe("ACTIVE");

    const existing = serviceWith({
      conversation: {
        findUnique: vi.fn().mockResolvedValue(convo()),
        findUniqueOrThrow: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
    });
    expect(
      await existing.ensureConversation("ride-1", "rider-1", "driver-1"),
    ).toMatchObject({ id: "c-1" });
  });

  it("survives creation races via the UNIQUE(rideId) fallback", async () => {
    const svc = serviceWith({
      conversation: {
        findUnique: vi.fn().mockResolvedValue(null),
        findUniqueOrThrow: vi.fn().mockResolvedValue(convo()),
        create: vi.fn().mockRejectedValue(new Error("Unique constraint")),
        update: vi.fn(),
        findMany: vi.fn(),
      },
    });
    expect(
      await svc.ensureConversation("ride-1", "rider-1", "driver-1"),
    ).toMatchObject({ id: "c-1" });
  });

  it("posts system messages only for known events on ACTIVE conversations", async () => {
    const svc = serviceWith({});
    const msg = (await svc.postSystemMessage("ride-1", "ASSIGNED")) as {
      type: string;
    };
    expect(msg.type).toBe("SYSTEM");
    expect(await svc.postSystemMessage("ride-1", "NOPE")).toBeNull();

    const closed = serviceWith({
      conversation: {
        findUnique: vi.fn().mockResolvedValue(convo({ status: "CLOSED" })),
        findUniqueOrThrow: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
    });
    expect(await closed.postSystemMessage("ride-1", "ASSIGNED")).toBeNull();
  });

  it("closes conversations once", async () => {
    const update = vi
      .fn()
      .mockImplementation((a: { data: object }) => Promise.resolve(a.data));
    const svc = serviceWith({
      conversation: {
        findUnique: vi.fn().mockResolvedValue(convo()),
        findUniqueOrThrow: vi.fn(),
        create: vi.fn(),
        update,
        findMany: vi.fn(),
      },
    });
    await svc.closeConversation("ride-1");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "CLOSED" }),
      }),
    );
    const already = serviceWith({
      conversation: {
        findUnique: vi.fn().mockResolvedValue(convo({ status: "CLOSED" })),
        findUniqueOrThrow: vi.fn(),
        create: vi.fn(),
        update,
        findMany: vi.fn(),
      },
    });
    await already.closeConversation("ride-1");
  });
});

describe("MessagingService send rules (spec §18, §20, §34)", () => {
  it("rejects outsiders, empty, oversized, and non-TEXT client messages", async () => {
    const svc = serviceWith({});
    await expect(
      svc.sendMessage("c-1", "stranger", { content: "hi" }),
    ).rejects.toThrow("not a participant");
    await expect(
      svc.sendMessage("c-1", "rider-1", { content: "   " }),
    ).rejects.toThrow("must not be empty");
    await expect(
      svc.sendMessage("c-1", "rider-1", { content: "x".repeat(1001) }),
    ).rejects.toThrow("exceeds 1000");
    await expect(
      svc.sendMessage("c-1", "rider-1", {
        type: "SYSTEM" as never,
        content: "forged",
      }),
    ).rejects.toThrow("only TEXT");
  });

  it("rejects sends on closed conversations", async () => {
    const svc = serviceWith({
      conversation: {
        findUnique: vi.fn().mockResolvedValue(null),
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValue(convo({ status: "CLOSED" })),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
    });
    await expect(
      svc.sendMessage("c-1", "rider-1", { content: "hi" }),
    ).rejects.toThrow("conversation is CLOSED");
  });

  it("derives the recipient server-side and returns duplicates on retry", async () => {
    const create = vi
      .fn()
      .mockImplementation((a: { data: object }) =>
        Promise.resolve({ id: "m-1", ...a.data }),
      );
    const svc = serviceWith({
      message: {
        create,
        findUnique: vi.fn().mockResolvedValue(null),
        findUniqueOrThrow: vi.fn(),
        findMany: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn(),
      },
    });
    const sent = (await svc.sendMessage("c-1", "rider-1", {
      content: "hello",
    })) as {
      senderId: string;
      recipientId: string;
      status: string;
    };
    expect(sent).toMatchObject({
      senderId: "rider-1",
      recipientId: "driver-1",
      status: "SENT",
    });

    const withId = serviceWith({
      message: {
        create,
        findUnique: vi.fn().mockResolvedValue(null),
        findUniqueOrThrow: vi.fn(),
        findMany: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn(),
      },
    });
    await withId.sendMessage("c-1", "rider-1", {
      content: "hi",
      clientMessageId: "abc",
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content: "hi",
          clientMessageId: "abc",
        }),
      }),
    );

    const dupe = serviceWith({
      message: {
        create,
        findUnique: vi.fn().mockResolvedValue({ id: "m-0" }),
        findUniqueOrThrow: vi.fn(),
        findMany: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn(),
      },
    });
    expect(
      await dupe.sendMessage("c-1", "rider-1", {
        content: "hello",
        clientMessageId: "abc",
      }),
    ).toMatchObject({ id: "m-0" });
    const createsAfterRetry = create.mock.calls.filter((call) =>
      JSON.stringify(call[0]).includes('"clientMessageId":"abc"'),
    );
    expect(createsAfterRetry).toHaveLength(1);
  });

  it("rate-limits senders server-side", async () => {
    const svc = serviceWith({});
    for (let i = 0; i < 20; i += 1) {
      await svc.sendMessage("c-1", "rider-1", { content: `msg ${i}` });
    }
    await expect(
      svc.sendMessage("c-1", "rider-1", { content: "one too many" }),
    ).rejects.toThrow("rate limit exceeded");
  });

  it("pushes only when the recipient is not viewing", async () => {
    const viewing = serviceWith({});
    await viewing.sendMessage("c-1", "rider-1", { content: "hi" });
    expect(viewing.sent.enqueue).not.toHaveBeenCalled();

    const away = serviceWith({});
    (away.live.isViewing as ReturnType<typeof vi.fn>).mockReturnValue(false);
    await away.sendMessage("c-1", "rider-1", { content: "hi" });
    expect(away.sent.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ channel: "PUSH", template: "NEW_MESSAGE" }),
    );
  });

  it("fans push out per device token", async () => {
    const svc = serviceWith({
      deviceToken: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ token: "tok-a" }, { token: "tok-b" }]),
      },
    });
    (svc.live.isViewing as ReturnType<typeof vi.fn>).mockReturnValue(false);
    await svc.sendMessage("c-1", "rider-1", { content: "hi" });
    const calls = (svc.sent.enqueue as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][0]).toMatchObject({ to: "tok-a", channel: "PUSH" });
    expect(calls[1][0]).toMatchObject({ to: "tok-b", channel: "PUSH" });
  });
});

describe("MessagingService history and receipts (spec §7, §12, §13)", () => {
  it("pages newest-first with cursor guards", async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: "m-9" }]);
    const svc = serviceWith({
      message: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "m-5",
          conversationId: "c-1",
          createdAt: new Date(),
        }),
        findMany,
        updateMany: vi.fn(),
        count: vi.fn(),
      },
    });
    await svc.history("c-1", "rider-1", "m-5", 10);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    );
    await expect(svc.history("c-1", "stranger")).rejects.toThrow(
      "not a participant",
    );
  });

  it("marks delivered/read only for the recipient and broadcasts", async () => {
    const svc = serviceWith({});
    expect(await svc.markDelivered("c-1", "driver-1")).toEqual({
      delivered: 2,
    });
    expect(await svc.markRead("c-1", "driver-1")).toEqual({ read: 2 });
    expect(svc.live.broadcastConversation).toHaveBeenCalledWith(
      "c-1",
      "message.read",
      expect.objectContaining({ userId: "driver-1" }),
    );
    expect(await svc.unreadCount("driver-1")).toBe(3);
  });

  it("exposes conversations with per-conversation unread counts", async () => {
    const svc = serviceWith({
      conversation: {
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn().mockResolvedValue([convo()]),
      },
    });
    const mine = await svc.myConversations("rider-1");
    expect(mine[0]).toMatchObject({ id: "c-1", unread: 3 });
  });
});
