import { createHmac, timingSafeEqual } from "node:crypto";
import { decodeSession, type Session } from "./session-edge.js";

export type { Session };
export { decodeSession };

const unb64url = (s: string) => Buffer.from(s, "base64url");

/** Verify signature + expiry — server components and route handlers. */
export function verifySession(token: string, secret: string): Session {
  const [body, sig] = token.split(".");
  if (!body || !sig) throw new Error("malformed token");
  const expected = createHmac("sha256", secret).update(body).digest();
  const actual = unb64url(sig);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error("bad token signature");
  }
  const session = decodeSession(token);
  if (!session) throw new Error("token expired");
  return session;
}
