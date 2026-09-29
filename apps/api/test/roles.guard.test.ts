import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it } from "vitest";
import { roleMatches, RolesGuard } from "../src/auth/roles.guard.js";
import { PUBLIC_KEY, ROLES_KEY } from "../src/auth/roles.decorator.js";
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

function guardFor(required: string[], isPublic = false) {
  const reflector = {
    getAllAndOverride: (key: string) => {
      if (key === PUBLIC_KEY) return isPublic;
      if (key === ROLES_KEY) return required;
      return undefined;
    },
  } as unknown as Reflector;
  return new RolesGuard(reflector, tokens);
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
  it("denies by default when no roles are required", () => {
    const guard = guardFor([]);
    const ctx = contextWith(`Bearer ${tokens.sign("u", ["RIDER"])}`);
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it("allows a bearer with a matching role", () => {
    const guard = guardFor(["AGENCY:abc:*"]);
    const ctx = contextWith(`Bearer ${tokens.sign("u", ["AGENCY:abc:OWNER"])}`);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("denies missing, malformed, and forged credentials", () => {
    const guard = guardFor(["RIDER"]);
    expect(guard.canActivate(contextWith())).toBe(false);
    expect(guard.canActivate(contextWith("Bearer nope"))).toBe(false);
    expect(guard.canActivate(contextWith("Bearer forged.payload.sig"))).toBe(
      false,
    );
  });

  it("denies a valid token with the wrong role", () => {
    const guard = guardFor(["ADMIN:OPS"]);
    const ctx = contextWith(`Bearer ${tokens.sign("u", ["RIDER"])}`);
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it("lets @Public() routes through without credentials", () => {
    const guard = guardFor([], true);
    expect(guard.canActivate(contextWith())).toBe(true);
  });
});
