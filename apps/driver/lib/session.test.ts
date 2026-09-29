import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decodeSession, verifySession } from "./session.js";

const SECRET = "driver-session-test";

function sign(sub: string, roles: string[]): string {
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(
    JSON.stringify({ sub, roles, iat: now, exp: now + 3600 }),
  ).toString("base64url");
  return `${body}.${createHmac("sha256", SECRET).update(body).digest("base64url")}`;
}

describe("driver session helpers", () => {
  it("decodes any signed-in user (drivers, riders, staff)", () => {
    expect(decodeSession(sign("u", ["DRIVER:d-1"]))).toMatchObject({
      sub: "u",
    });
    expect(decodeSession(sign("u", ["RIDER"]))).toMatchObject({ sub: "u" });
  });

  it("verifies signatures server-side", () => {
    expect(verifySession(sign("u", ["DRIVER:d-1"]), SECRET).sub).toBe("u");
    expect(() => verifySession(sign("u", ["DRIVER:d-1"]), "wrong")).toThrow(
      "bad token signature",
    );
    expect(decodeSession("garbage")).toBeNull();
  });
});
