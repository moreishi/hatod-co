import { describe, expect, it } from "vitest";
import {
  buildOtp,
  otpThrottle,
  verifyOtpAttempt,
  type OtpRecord,
} from "./otp";

const NOW = new Date("2026-09-28T12:00:00Z");

function record(over: Partial<OtpRecord> = {}): OtpRecord {
  return {
    phone: "+639171110011",
    codeHash: "hash",
    expiresAt: new Date(NOW.getTime() + 5 * 60_000).toISOString(),
    attempts: 0,
    requestedAt: NOW.toISOString(),
    ...over,
  };
}

describe("buildOtp", () => {
  it("makes 6-digit numeric codes", () => {
    for (let i = 0; i < 20; i++) expect(buildOtp()).toMatch(/^\d{6}$/);
  });
});

describe("otpThrottle (SMS money guard)", () => {
  it("allows first request, blocks resends within 60s", () => {
    expect(otpThrottle(null, NOW).ok).toBe(true);
    const recent = new Date(NOW.getTime() - 30_000).toISOString();
    const r = otpThrottle({ ...record(), requestedAt: recent }, NOW);
    expect(r.ok).toBe(false);
    expect(r.retryAfterS).toBeGreaterThan(0);
  });

  it("allows after the window", () => {
    const old = new Date(NOW.getTime() - 61_000).toISOString();
    expect(otpThrottle({ ...record(), requestedAt: old }, NOW).ok).toBe(true);
  });
});

describe("verifyOtpAttempt", () => {
  it("accepts the right code once", () => {
    expect(verifyOtpAttempt(record(), true, NOW)).toEqual({ ok: true });
  });

  it("rejects expired codes", () => {
    const expired = record({
      expiresAt: new Date(NOW.getTime() - 1000).toISOString(),
    });
    expect(verifyOtpAttempt(expired, true, NOW).ok).toBe(false);
  });

  it("locks after 5 wrong attempts", () => {
    const r = verifyOtpAttempt(record({ attempts: 4 }), false, NOW);
    expect(r).toEqual({ ok: false, locked: true });
    expect(verifyOtpAttempt(record({ attempts: 5 }), false, NOW).ok).toBe(false);
  });
});
