import { Injectable } from "@nestjs/common";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export interface TokenPayload {
  sub: string;
  roles: string[];
  iat: number;
  exp: number;
  /** Session id; absent on tokens issued before server-side sessions. */
  jti?: string;
}

/** Session/token lifetime: logout revokes earlier via the Session row. */
export const TOKEN_TTL_SECONDS = 12 * 3600;

const b64url = (buf: Buffer) => buf.toString("base64url");
const unb64url = (s: string) => Buffer.from(s, "base64url");

/**
 * Minimal HMAC-SHA256 token (JWT shape, no dependency).
 * Secret comes from JWT_SECRET; LocalStage falls back to a dev secret.
 */
@Injectable()
export class TokenService {
  private readonly secret: string;

  constructor() {
    this.secret = process.env.JWT_SECRET ?? "dev-secret-change-me";
  }

  sign(
    sub: string,
    roles: string[],
    ttlSeconds = TOKEN_TTL_SECONDS,
    jti: string = randomUUID(),
  ): string {
    const now = Math.floor(Date.now() / 1000);
    const payload: TokenPayload = {
      sub,
      roles,
      iat: now,
      exp: now + ttlSeconds,
      jti,
    };
    const body = b64url(Buffer.from(JSON.stringify(payload)));
    const sig = b64url(createHmac("sha256", this.secret).update(body).digest());
    return `${body}.${sig}`;
  }

  verify(token: string): TokenPayload {
    const [body, sig] = token.split(".");
    if (!body || !sig) throw new Error("malformed token");
    const expected = createHmac("sha256", this.secret).update(body).digest();
    const actual = unb64url(sig);
    if (
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    ) {
      throw new Error("bad token signature");
    }
    const payload = JSON.parse(unb64url(body).toString("utf8")) as TokenPayload;
    if (payload.exp <= Math.floor(Date.now() / 1000))
      throw new Error("token expired");
    return payload;
  }
}
