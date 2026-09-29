import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decodeSession, isAgencyStaff, verifySession } from "./session.js";
const SECRET = "agency-session-test";

function sign(sub: string, roles: string[]): string {
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(
    JSON.stringify({ sub, roles, iat: now, exp: now + 3600 }),
  ).toString("base64url");
  return `${body}.${createHmac("sha256", SECRET).update(body).digest("base64url")}`;
}

describe("agency session helpers", () => {
  it("recognises agency staff and admins, not plain riders", () => {
    expect(
      isAgencyStaff(decodeSession(sign("u", ["AGENCY:ag-1:DISPATCHER"]))!),
    ).toBe(true);
    expect(isAgencyStaff(decodeSession(sign("u", ["ADMIN:OPS"]))!)).toBe(true);
    expect(isAgencyStaff(decodeSession(sign("u", ["RIDER"]))!)).toBe(false);
  });

  it("verifies signatures server-side", () => {
    expect(verifySession(sign("u", ["RIDER"]), SECRET).sub).toBe("u");
    expect(() => verifySession(sign("u", ["RIDER"]), "wrong")).toThrow(
      "bad token signature",
    );
  });
});
