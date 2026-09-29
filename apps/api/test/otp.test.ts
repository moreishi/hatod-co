import { describe, expect, it } from "vitest";
import { generateOtp, hashOtp, otpMatches } from "../src/auth/otp.js";

describe("otp helpers", () => {
  it("generates zero-padded 6-digit codes", () => {
    for (let i = 0; i < 50; i += 1) {
      expect(generateOtp()).toMatch(/^\d{6}$/);
    }
  });

  it("matches the right code and rejects the wrong one", () => {
    const hash = hashOtp("123456");
    expect(otpMatches("123456", hash)).toBe(true);
    expect(otpMatches("654321", hash)).toBe(false);
  });
});
