import { describe, expect, it } from "vitest";
import { hashPassword, parseCredentials, verifyPassword } from "./auth";
import { canAccess, isPublicPath } from "./access";

describe("parseCredentials", () => {
  it("accepts email or phone plus password", () => {
    expect(parseCredentials({ login: "ops@hatod.co", password: "Hatod123!" }).login).toBe(
      "ops@hatod.co",
    );
    expect(parseCredentials({ login: "09171110011", password: "Hatod123!" }).login).toBe(
      "09171110011",
    );
  });

  it("rejects empty login and short password", () => {
    expect(() => parseCredentials({ login: "  ", password: "Hatod123!" })).toThrow(/login/i);
    expect(() => parseCredentials({ login: "ops@hatod.co", password: "short" })).toThrow(
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

  it("lets the agency sign-in through", () => {
    expect(isPublicPath("/fleet/login")).toBe(true);
  });

  it("lets the driver sign-in through", () => {
    expect(isPublicPath("/drivers/login")).toBe(true);
  });

  it("protects app pages, leaves API routes to their own session checks", () => {
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/drivers")).toBe(false);
    expect(isPublicPath("/api/health")).toBe(true);
    expect(isPublicPath("/api/driver-documents")).toBe(true);
  });
});
