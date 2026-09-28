import { describe, expect, it } from "vitest";
import { hashPassword, parseCredentials, verifyPassword } from "./auth";
import { canAccess, isPublicPath } from "./access";

describe("parseCredentials", () => {
  it("accepts valid email + password", () => {
    expect(
      parseCredentials({ email: "ops@hatod.co", password: "Hatod123!" }).email,
    ).toBe("ops@hatod.co");
  });

  it("rejects bad email and short password", () => {
    expect(() => parseCredentials({ email: "not-an-email", password: "Hatod123!" })).toThrow(
      /email/i,
    );
    expect(() => parseCredentials({ email: "ops@hatod.co", password: "short" })).toThrow(
      /password/i,
    );
  });
});

describe("password hashing (scrypt)", () => {
  it("verifies a correct password and rejects a wrong one", async () => {
    const hash = await hashPassword("Hatod123!");
    expect(await verifyPassword("Hatod123!", hash)).toBe(true);
    expect(await verifyPassword("wrong-pass", hash)).toBe(false);
  });

  it("produces unique salts", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });
});

describe("canAccess (role gate)", () => {
  it("superadmin passes every role", () => {
    for (const r of ["operations", "finance", "support"] as const)
      expect(canAccess("superadmin", r)).toBe(true);
  });

  it("exact role passes, others fail", () => {
    expect(canAccess("finance", "finance")).toBe(true);
    expect(canAccess("finance", "operations")).toBe(false);
  });
});

describe("isPublicPath (proxy allowlist)", () => {
  it("lets login and auth callbacks through", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/api/auth/callback/credentials")).toBe(true);
  });

  it("protects everything else", () => {
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/drivers")).toBe(false);
    expect(isPublicPath("/api/health")).toBe(false);
  });
});
