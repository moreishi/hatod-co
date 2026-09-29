import { describe, expect, it, vi } from "vitest";
import { purgeMessaging } from "../src/index.js";

describe("purgeMessaging (spec §30)", () => {
  it("purges messages past retention and old closed conversations", async () => {
    const message = { deleteMany: vi.fn().mockResolvedValue({ count: 7 }) };
    const conversation = {
      deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
    };
    const result = await purgeMessaging(
      { message, conversation } as never,
      1_000_000_000_000,
    );
    expect(result).toEqual({ messages: 7, conversations: 2 });
    expect(message.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { createdAt: { lt: expect.any(Date) } },
      }),
    );
    expect(conversation.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "CLOSED" }),
      }),
    );
  });
});
