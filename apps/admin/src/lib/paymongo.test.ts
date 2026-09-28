import { describe, expect, it } from "vitest";
import {
  buildPaymentLinkPayload,
  gcashFee,
  verifyWebhookSignature,
} from "./paymongo";

const RAW = '{"data":{"id":"evt_test"}}';
// HMAC-SHA256("1496734173." + RAW, key "whsec_dev"), generated once via node:crypto.
const SIG = "3aeca8e0036bfecb8b499d5a160cad526c63dda2fd1c733ba8e5b50be0cb7ccc";
const HEADER = `t=1496734173,te=${SIG},li=`;

describe("buildPaymentLinkPayload (PayMongo /v1/payment_links)", () => {
  it("encodes centavos, PHP, trip metadata", () => {
    const p = buildPaymentLinkPayload({ tripId: "trip-1", fare: 124, riderName: "R. Garcia" });
    expect(p).toEqual({
      amount: 12400,
      currency: "PHP",
      description: "Hatod ride trip-1 — R. Garcia",
      metadata: { trip_id: "trip-1" },
    });
  });

  it("rejects sub-minimum fares", () => {
    expect(() => buildPaymentLinkPayload({ tripId: "t", fare: 0, riderName: "R" })).toThrow(
      /amount/i,
    );
  });
});

describe("gcashFee (2.23%)", () => {
  it("rounds the platform's e-wallet cost", () => {
    expect(gcashFee(12400)).toBe(Math.round(12400 * 0.0223));
  });
});

describe("verifyWebhookSignature (t.te.li scheme)", () => {
  it("accepts a genuine test-mode signature", () => {
    expect(verifyWebhookSignature(RAW, HEADER, "whsec_dev", false)).toBe(true);
  });

  it("rejects tampered bodies, wrong secrets, malformed headers", () => {
    expect(verifyWebhookSignature('{"data":{"id":"evil"}}', HEADER, "whsec_dev", false)).toBe(
      false,
    );
    expect(verifyWebhookSignature(RAW, HEADER, "wrong", false)).toBe(false);
    expect(verifyWebhookSignature(RAW, "garbage", "whsec_dev", false)).toBe(false);
    expect(verifyWebhookSignature(RAW, HEADER, "whsec_dev", true)).toBe(false);
  });
});
