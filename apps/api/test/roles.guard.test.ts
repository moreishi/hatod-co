import { createHmac } from "node:crypto";
import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";
import { roleMatches, RolesGuard } from "../src/auth/roles.guard.js";
import { PUBLIC_KEY, ROLES_KEY } from "../src/auth/roles.decorator.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { TokenService } from "../src/auth/token.service.js";

const tokens = new TokenService();

function contextWith(authHeader?: string): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization: authHeader ?? "" } }),
    }),
  } as unknown as ExecutionContext;
}

function guardFor(
  required: string[],
  isPublic = false,
  session: unknown = "active",
) {
  const reflector = {
    getAllAndOverride: (key: string) => {
      if (key === PUBLIC_KEY) return isPublic;
      if (key === ROLES_KEY) return required;
      return undefined;
    },
  } as unknown as Reflector;
  const prisma = {
    session: {
      findUnique: vi.fn().mockImplementation(() => {
        if (session === "active")
          return Promise.resolve({ id: "s-1", userId: "u", revokedAt: null });
        return Promise.resolve(session);
      }),
    },
  } as unknown as PrismaService;
  return new RolesGuard(reflector, tokens, prisma);
}

/** Pre-session token shape (no jti): grandfathered, still honored. */
function legacyToken(sub: string, roles: string[]): string {
  const secret = process.env.JWT_SECRET ?? "dev-secret-change-me";
  const body = Buffer.from(
    JSON.stringify({
      sub,
      roles,
      iat: Math.floor(Date.now() / 1000),
      exp: 9_999_999_999,
    }),
  ).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

describe("roleMatches", () => {
  it("matches exact roles and agency wildcards", () => {
    expect(roleMatches("ADMIN:OPS", "ADMIN:OPS")).toBe(true);
    expect(roleMatches("ADMIN:OPS", "ADMIN:SUPPORT")).toBe(false);
    expect(roleMatches("AGENCY:abc:*", "AGENCY:abc:DISPATCHER")).toBe(true);
    expect(roleMatches("AGENCY:abc:*", "AGENCY:xyz:OWNER")).toBe(false);
  });
});

describe("RolesGuard (spec rule 49)", () => {
  it("denies by default when no roles are required", async () => {
    const guard = guardFor([]);
    const ctx = contextWith(`Bearer ${tokens.sign("u", ["RIDER"])}`);
    await expect(guard.canActivate(ctx)).resolves.toBe(false);
  });

  it("allows a bearer with a matching role", async () => {
    const guard = guardFor(["AGENCY:abc:*"]);
    const ctx = contextWith(`Bearer ${tokens.sign("u", ["AGENCY:abc:OWNER"])}`);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it("denies missing, malformed, and forged credentials", async () => {
    const guard = guardFor(["RIDER"]);
    await expect(guard.canActivate(contextWith())).resolves.toBe(false);
    await expect(guard.canActivate(contextWith("Bearer nope"))).resolves.toBe(
      false,
    );
    await expect(
      guard.canActivate(contextWith("Bearer forged.payload.sig")),
    ).resolves.toBe(false);
  });

  it("denies a valid token with the wrong role", async () => {
    const guard = guardFor(["ADMIN:OPS"]);
    const ctx = contextWith(`Bearer ${tokens.sign("u", ["RIDER"])}`);
    await expect(guard.canActivate(ctx)).resolves.toBe(false);
  });

  it("lets @Public() routes through without credentials", async () => {
    const guard = guardFor([], true);
    await expect(guard.canActivate(contextWith())).resolves.toBe(true);
  });

  it("denies tokens whose session is revoked or missing", async () => {
    const revoked = guardFor(["RIDER"], false, {
      id: "s-9",
      userId: "u",
      revokedAt: new Date(),
    });
    const ctx = contextWith(`Bearer ${tokens.sign("u", ["RIDER"])}`);
    await expect(revoked.canActivate(ctx)).resolves.toBe(false);

    const missing = guardFor(["RIDER"], false, null);
    await expect(missing.canActivate(ctx)).resolves.toBe(false);
  });

  it("honors active sessions and grandfathered tokens without jti", async () => {
    const guard = guardFor(["RIDER"]);
    const ctx = contextWith(`Bearer ${tokens.sign("u", ["RIDER"])}`);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);

    const legacy = guardFor(["RIDER"], false, null);
    const legacyCtx = contextWith(`Bearer ${legacyToken("u", ["RIDER"])}`);
    await expect(legacy.canActivate(legacyCtx)).resolves.toBe(true);
  });
});
