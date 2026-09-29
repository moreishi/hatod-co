import { describe, expect, it } from "vitest";
import {
  ONBOARDING_STEPS,
  canGoLive,
  completeStep,
  validateSignup,
  type OnboardingState,
} from "./onboarding";

describe("validateSignup (public agency signup)", () => {
  it("accepts a complete signup (no password — OTP login)", () => {
    const s = validateSignup({
      name: "Maria Santos",
      email: "maria@fleet.ph",
      businessName: "Gensan Fleet Co",
      contactPhone: "09171110011",
      country: "Philippines",
      province: "South Cotabato",
      city: "General Santos",
    });
    expect(s.email).toBe("maria@fleet.ph");
    expect(s.contactPhone).toBe("+639171110011");
    expect(s.city).toBe("General Santos");
  });

  it("defaults country to Philippines, requires province and city", () => {
    const base = {
      name: "Maria",
      email: "maria@fleet.ph",
      businessName: "Fleet Co",
      contactPhone: "09171110011",
      province: "South Cotabato",
      city: "General Santos",
    };
    expect(validateSignup(base).country).toBe("Philippines");
    expect(() => validateSignup({ ...base, email: "nope" })).toThrow(/email/i);
    expect(() => validateSignup({ ...base, province: "  " })).toThrow(/province/i);
    expect(() => validateSignup({ ...base, city: "" })).toThrow(/city/i);
    expect(() => validateSignup({ ...base, contactPhone: "123" })).toThrow(/phone/i);
  });
});

function fresh(): OnboardingState {
  return { applicationId: "app-1", done: [] };
}

describe("completeStep (ordered onboarding)", () => {
  it("completes steps in order", () => {
    let s = completeStep(fresh(), "docs");
    expect(s.done).toEqual(["docs"]);
    s = completeStep(s, "fleet");
    expect(s.done).toEqual(["docs", "fleet"]);
  });

  it("refuses skipping ahead", () => {
    expect(() => completeStep(fresh(), "fleet")).toThrow(/docs/i);
  });

  it("refuses repeats and unknown steps", () => {
    const s = completeStep(fresh(), "docs");
    expect(() => completeStep(s, "docs")).toThrow(/already/i);
    expect(() => completeStep(s, "teleport" as never)).toThrow(/step/i);
  });
});

describe("canGoLive", () => {
  it("is false until every step is done", () => {
    expect(canGoLive(fresh())).toBe(false);
    let s = fresh();
    for (const step of ONBOARDING_STEPS) s = completeStep(s, step);
    expect(canGoLive(s)).toBe(true);
  });
});
