import { describe, expect, it } from "vitest";
import { canManageUsers } from "./access";
import { validateUser } from "./users";

describe("validateUser", () => {
  it("trims and accepts valid input, normalizes phone", () => {
    expect(
      validateUser({
        name: "  Ops Lead ",
        email: "OPS@hatod.co",
        phone: "09171110011",
        role: "operations",
      }),
    ).toEqual({
      name: "Ops Lead",
      email: "ops@hatod.co",
      phone: "+639171110011",
      role: "operations",
    });
  });

  it("rejects bad email, bad phone, unknown role", () => {
    const base = { name: "Ops", email: "ops@hatod.co", phone: "09171110011", role: "operations" };
    expect(() => validateUser({ ...base, email: "nope" })).toThrow(/email/i);
    expect(() => validateUser({ ...base, phone: "123" })).toThrow(/phone/i);
    expect(() => validateUser({ ...base, role: "root" })).toThrow(/role/i);
    expect(() => validateUser({ ...base, name: "  " })).toThrow(/name/i);
  });
});

describe("canManageUsers", () => {
  it("only superadmin manages team accounts", () => {
    expect(canManageUsers("superadmin")).toBe(true);
    expect(canManageUsers("operations")).toBe(false);
    expect(canManageUsers("finance")).toBe(false);
    expect(canManageUsers("support")).toBe(false);
  });
});
