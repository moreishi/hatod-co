import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decodeSession, isAdmin, verifySession } from "./session.js";

const SECRET = "session-test-secret";

function sign(sub: string, roles: string[], ttlSeconds = 3600): string {
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(
    JSON.stringify({ sub, roles, iat: now, exp: now + ttlSeconds }),
  ).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

describe("admin session helpers", () => {
  it("verifies a well-formed token and detects admins", () => {
    const session = verifySession(sign("u-1", ["ADMIN:OPS", "RIDER"]), SECRET);
    expect(session.sub).toBe("u-1");
    expect(isAdmin(session)).toBe(true);
    expect(isAdmin(verifySession(sign("u-2", ["RIDER"]), SECRET))).toBe(false);
  });

  it("rejects forged and expired tokens", () => {
    const good = sign("u-1", ["ADMIN:OPS"]);
    const [body, sig] = good.split(".");
    expect(() => verifySession(`${body}tampered.${sig}`, SECRET)).toThrow(
      "bad token signature",
    );
    expect(() => verifySession(sign("u-1", [], -10), SECRET)).toThrow(
      "token expired",
    );
    expect(decodeSession("garbage")).toBeNull();
  });
});
