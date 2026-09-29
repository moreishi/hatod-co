import { describe, expect, it } from "vitest";
import {
  reviewApplication,
  validateApplication,
  type AgencyApplication,
} from "./onboarding";
import { canReviewAgency } from "./access";

function pending(): AgencyApplication {
  return {
    id: "app-1",
    userId: "usr-1",
    businessName: "Gensan Fleet Co",
    contactPhone: "+639171110011",
    status: "pending",
    createdAt: new Date().toISOString(),
  };
}

describe("validateApplication", () => {
  it("accepts a complete application with service area", () => {
    expect(
      validateApplication({
        businessName: " Gensan Fleet Co ",
        contactPhone: "09171110011",
        country: "Philippines",
        province: "South Cotabato",
        city: "General Santos",
      }).city,
    ).toBe("General Santos");
  });

  it("rejects missing business, bad phone, or missing area", () => {
    const base = {
      businessName: "Fleet",
      contactPhone: "09171110011",
      country: "Philippines",
      province: "South Cotabato",
      city: "General Santos",
    };
    expect(() =>
      validateApplication({ ...base, businessName: "  " }),
    ).toThrow(/business/i);
    expect(() =>
      validateApplication({ ...base, contactPhone: "123" }),
    ).toThrow(/phone/i);
    expect(() => validateApplication({ ...base, city: " " })).toThrow(/city/i);
  });
});

describe("reviewApplication (state machine)", () => {
  it("approves a pending application", () => {
    expect(reviewApplication(pending(), "approve").status).toBe("approved");
  });

  it("rejects a pending application", () => {
    expect(reviewApplication(pending(), "reject").status).toBe("rejected");
  });

  it("refuses to re-review decided applications", () => {
    const done = { ...pending(), status: "approved" as const };
    expect(() => reviewApplication(done, "reject")).toThrow(/pending/i);
  });
});

describe("canReviewAgency", () => {
  it("admits superadmin and operations only", () => {
    expect(canReviewAgency("superadmin")).toBe(true);
    expect(canReviewAgency("operations")).toBe(true);
    expect(canReviewAgency("finance")).toBe(false);
    expect(canReviewAgency("agency")).toBe(false);
  });
});
