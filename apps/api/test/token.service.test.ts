import { describe, expect, it } from "vitest";
import { TokenService } from "../src/auth/token.service.js";

const svc = new TokenService();

describe("TokenService", () => {
  it("round-trips sub + roles", () => {
    const token = svc.sign("user-1", ["ADMIN:OPS", "RIDER"]);
    const payload = svc.verify(token);
    expect(payload.sub).toBe("user-1");
    expect(payload.roles).toEqual(["ADMIN:OPS", "RIDER"]);
  });

  it("rejects tampered payloads", () => {
    const [body, sig] = svc.sign("u", []).split(".");
    const forged = `${Buffer.from('{"sub":"root"}').toString("base64url")}.${sig}`;
    expect(() => svc.verify(forged)).toThrow("bad token signature");
    expect(body).toBeTruthy();
  });

  it("rejects expired tokens", () => {
    const token = svc.sign("u", [], -10);
    expect(() => svc.verify(token)).toThrow("token expired");
  });

  it("rejects malformed tokens", () => {
    expect(() => svc.verify("nope")).toThrow("malformed token");
  });
});
