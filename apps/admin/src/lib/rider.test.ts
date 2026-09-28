import { describe, expect, it } from "vitest";
import { canBook } from "./rider";
import { validateRiderInput } from "./riders";
import type { Rider } from "./types";

function rider(over: Partial<Rider> = {}): Rider {
  return {
    id: "rdr-tdd",
    name: "TDD Rider",
    phone: "+639171110099",
    status: "active",
    createdAt: new Date().toISOString(),
    ...over,
  };
}

describe("validateRiderInput (identity rules)", () => {
  it("trims and lowercases, empty email becomes null", () => {
    expect(
      validateRiderInput({ name: "  R. Garcia ", phone: "09171110011", email: "" }),
    ).toEqual({ name: "R. Garcia", phone: "09171110011", email: null });
    expect(
      validateRiderInput({ name: "R", phone: "09171110011", email: "R@X.PH" }).email,
    ).toBe("r@x.ph");
  });

  it("rejects bad email, keeps phone mandatory", () => {
    expect(() =>
      validateRiderInput({ name: "R", phone: "09171110011", email: "nope" }),
    ).toThrow(/email/i);
    expect(() => validateRiderInput({ name: "", phone: "09171110011" })).toThrow(/name/i);
    expect(() => validateRiderInput({ name: "R", phone: "" })).toThrow(/phone/i);
  });
});

describe("canBook (rider gate)", () => {
  it("allows an active rider with a phone", () => {
    expect(canBook(rider())).toEqual({ ok: true });
  });

  it("blocks suspended riders", () => {
    const res = canBook(rider({ status: "suspended" }));
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/suspend/i);
  });

  it("blocks riders with no phone", () => {
    const res = canBook(rider({ phone: "" }));
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/phone/i);
  });
});
