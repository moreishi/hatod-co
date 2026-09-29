import { describe, expect, it, vi } from "vitest";
import { OutboxConsumer } from "../src/outbox.js";

function consumerWith(
  rows: object[],
  provider?: { send: ReturnType<typeof vi.fn> },
) {
  const updates: { where: { id: string }; data: Record<string, unknown> }[] =
    [];
  const prisma = {
    notification: {
      findMany: vi.fn().mockResolvedValue(rows),
      update: vi.fn().mockImplementation((a: (typeof updates)[number]) => {
        updates.push(a);
        return Promise.resolve({});
      }),
    },
  };
  const send =
    provider?.send ??
    vi.fn().mockResolvedValue({
      providerMessageId: "log-1",
      deliveredAt: new Date(),
    });
  const consumer = new OutboxConsumer(prisma, {
    SMS: { channel: "SMS", send } as never,
  });
  return { consumer, updates, send };
}

const row = (overrides: object = {}) => ({
  id: "n-1",
  channel: "SMS",
  template: "Your code is {{code}}",
  payload: JSON.stringify({ to: "09170000001", variables: { code: "1" } }),
  attempts: 0,
  ...overrides,
});

describe("OutboxConsumer", () => {
  it("marks deliveries SENT and renders the template", async () => {
    const { consumer, updates, send } = consumerWith([row()]);
    expect(await consumer.drain()).toMatchObject({
      sent: 1,
      failed: 0,
      deferred: 0,
    });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "09170000001",
        template: "Your code is {{code}}",
      }),
    );
    expect(updates[0]).toMatchObject({
      where: { id: "n-1" },
      data: { status: "SENT" },
    });
  });

  it("fails rows with no provider or no destination", async () => {
    const { consumer, updates } = consumerWith([
      row({ id: "a", channel: "PIGEON" }),
      row({ id: "b", payload: "{}" }),
    ]);
    expect(await consumer.drain()).toMatchObject({
      sent: 0,
      failed: 2,
      deferred: 0,
    });
    expect(updates.map((u) => u.data.status)).toEqual(["FAILED", "FAILED"]);
  });

  it("fails exhausted rows after the last retry", async () => {
    const failing = { send: vi.fn().mockRejectedValue(new Error("boom")) };
    const { consumer, updates } = consumerWith(
      [row({ id: "c", attempts: 4 })],
      failing,
    );
    expect(await consumer.drain()).toMatchObject({ failed: 1 });
    expect(updates[0].data).toMatchObject({ status: "FAILED", attempts: 5 });
  });

  it("defers transient failures for a later drain", async () => {
    const { consumer, updates } = consumerWith([row()], {
      send: vi.fn().mockRejectedValueOnce(new Error("timeout")),
    });
    expect(await consumer.drain()).toMatchObject({ deferred: 1 });
    expect(updates[0].data).toMatchObject({ status: "QUEUED", attempts: 1 });
  });
});
