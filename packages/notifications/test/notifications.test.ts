import { describe, expect, it } from "vitest";
import {
  LogEmailProvider,
  LogPushProvider,
  LogSmsProvider,
  renderTemplate,
  Templates,
} from "../src/index.js";

describe("renderTemplate", () => {
  it("substitutes variables and leaves unknowns intact", () => {
    expect(
      renderTemplate("Hi {{name}}, code {{code}}", { name: "Ana", code: 123 }),
    ).toBe("Hi Ana, code 123");
    expect(renderTemplate("Hi {{name}} {{missing}}", { name: "Ana" })).toBe(
      "Hi Ana {{missing}}",
    );
  });
});

describe("log providers (LocalStage)", () => {
  it("renders the OTP template and records the delivery", async () => {
    const sms = new LogSmsProvider();
    const receipt = await sms.send({
      channel: "SMS",
      to: "0917100000",
      template: Templates.OTP_CODE,
      variables: { code: "482916" },
    });
    expect(receipt.providerMessageId).toBe("log-1");
    expect(sms.deliveries[0].rendered).toContain("482916");
  });

  it("rejects cross-channel sends", async () => {
    const push = new LogPushProvider();
    await expect(
      push.send({ channel: "SMS", to: "x", template: "t", variables: {} }),
    ).rejects.toThrow("channel mismatch");
  });

  it("keeps one delivery log per channel", async () => {
    const email = new LogEmailProvider();
    await email.send({
      channel: "EMAIL",
      to: "a@x.com",
      template: "hi",
      variables: {},
    });
    expect(email.deliveries).toHaveLength(1);
  });
});
