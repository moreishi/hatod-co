import { describe, expect, it, vi } from "vitest";
import { FcmPushProvider } from "../src/fcm-provider.js";

describe("FcmPushProvider", () => {
  it("sends the rendered template to the device token", async () => {
    const sendOne = vi.fn().mockResolvedValue("fcm-msg-1");
    const provider = new FcmPushProvider("HATOD", sendOne);
    const receipt = await provider.send({
      channel: "PUSH",
      to: "device-token-9",
      template: "NEW_MESSAGE",
      variables: { sender: "driver" },
    });
    expect(sendOne).toHaveBeenCalledWith(
      "device-token-9",
      "HATOD",
      "New message from your driver.",
      expect.objectContaining({ template: "NEW_MESSAGE" }),
    );
    expect(receipt.providerMessageId).toBe("fcm-msg-1");
    expect(receipt.deliveredAt).toBeInstanceOf(Date);
  });

  it("rejects non-push channels", async () => {
    const provider = new FcmPushProvider(
      "HATOD",
      vi.fn().mockResolvedValue("x"),
    );
    await expect(
      provider.send({
        channel: "SMS",
        to: "0917",
        template: "OTP_CODE",
        variables: {},
      }),
    ).rejects.toThrow("channel mismatch");
  });
});
