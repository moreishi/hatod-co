import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decodeSession, verifySession } from "./session.js";

const SECRET = "rider-session-test";

function sign(sub: string, roles: string[]): string {
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(
    JSON.stringify({ sub, roles, iat: now, exp: now + 3600 }),
  ).toString("base64url");
  return `${body}.${createHmac("sha256", SECRET).update(body).digest("base64url")}`;
}

describe("rider session helpers", () => {
  it("decodes any signed-in user (riders, drivers, staff)", () => {
    expect(decodeSession(sign("u", ["RIDER"]))).toMatchObject({ sub: "u" });
    expect(decodeSession(sign("u", ["DRIVER:d-1"]))).toMatchObject({
      sub: "u",
    });
  });

  it("verifies signatures server-side", () => {
    expect(verifySession(sign("u", ["RIDER"]), SECRET).sub).toBe("u");
    expect(() => verifySession(sign("u", ["RIDER"]), "wrong")).toThrow(
      "bad token signature",
    );
    expect(decodeSession("garbage")).toBeNull();
  });
});
