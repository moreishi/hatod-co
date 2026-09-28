import { describe, expect, it } from "vitest";
import { ROLES, canAccess, isStaff } from "./access";
import { validateUser } from "./users";

describe("extended roles", () => {
  it("includes agency, driver and rider identities", () => {
    expect(ROLES).toEqual(
      expect.arrayContaining(["superadmin", "operations", "agency", "driver", "rider"]),
    );
  });

  it("accepts the new roles in user validation", () => {
    const base = { name: "Fleet Partner", email: "fleet@agency.ph", phone: "09171110099" };
    expect(validateUser({ ...base, role: "agency" }).role).toBe("agency");
    expect(validateUser({ ...base, role: "driver" }).role).toBe("driver");
    expect(validateUser({ ...base, role: "rider" }).role).toBe("rider");
  });

  it("superadmin still passes every gate", () => {
    expect(canAccess("superadmin", "agency")).toBe(true);
  });
});

describe("isStaff (admin-panel gate)", () => {
  it("admits ops-team roles only", () => {
    for (const r of ["superadmin", "operations", "finance", "support"] as const)
      expect(isStaff(r)).toBe(true);
  });

  it("keeps app identities out of the admin panel", () => {
    for (const r of ["agency", "driver", "rider"] as const) expect(isStaff(r)).toBe(false);
  });
});
