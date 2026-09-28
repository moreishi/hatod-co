import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizePhPhone } from "./phone";
import { queryDb } from "./db";
import { OTP_MAX_ATTEMPTS, OTP_TTL_MS, buildOtp, otpThrottle, verifyOtpAttempt } from "./otp";
import { getSms } from "./sms";

function pepper(): string {
  return process.env.OTP_SECRET ?? process.env.AUTH_SECRET ?? "dev-only-otp-pepper";
}

function hashCode(code: string): string {
  return createHmac("sha256", pepper()).update(code).digest("hex");
}

function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

interface OtpRow {
  phone: string;
  code_hash: string;
  expires_at: string;
  attempts: number;
  requested_at: string;
}

async function latest(phone: string): Promise<OtpRow | null> {
  const rows = await queryDb<OtpRow>("SELECT * FROM otp_codes WHERE phone = $1", [phone]);
  return rows[0] ?? null;
}

/**
 * Request a sign-in code. Throttled (1/min/phone); resend replaces the code.
 * Returns nothing secret — the code travels by SMS (or dev console).
 */
export async function requestOtp(rawPhone: string): Promise<{ retryAfterS?: number }> {
  const phone = normalizePhPhone(rawPhone);
  const prev = await latest(phone);
  const gate = otpThrottle(
    prev ? { requestedAt: prev.requested_at } : null,
    new Date(),
  );
  if (!gate.ok) return { retryAfterS: gate.retryAfterS };
  const code = buildOtp();
  const now = new Date();
  const expires = new Date(now.getTime() + OTP_TTL_MS).toISOString();
  // Resend replaces: upsert by phone.
  await queryDb(
    `INSERT INTO otp_codes (phone, code_hash, expires_at, attempts, requested_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (phone) DO UPDATE SET code_hash = $2, expires_at = $3, attempts = 0, requested_at = $5`,
    [phone, hashCode(code), expires, 0, now.toISOString()],
  );
  await getSms().send(phone, code);
  return {};
}

/** Verify a code. Single-use: consumes the row on success, expiry, or lockout. */
export async function verifyOtp(rawPhone: string, code: string): Promise<boolean> {
  let phone: string;
  try {
    phone = normalizePhPhone(rawPhone);
  } catch {
    return false;
  }
  const row = await latest(phone);
  if (!row) return false;
  const record = {
    phone: row.phone,
    codeHash: row.code_hash,
    expiresAt: row.expires_at,
    attempts: Number(row.attempts),
    requestedAt: row.requested_at,
  };
  const verdict = verifyOtpAttempt(record, sameHash(hashCode(code.trim()), row.code_hash));
  if (!verdict.ok) {
    if (verdict.locked || new Date(row.expires_at).getTime() < Date.now()) {
      await queryDb("DELETE FROM otp_codes WHERE phone = $1", [phone]);
    } else {
      await queryDb("UPDATE otp_codes SET attempts = $1 WHERE phone = $2", [
        Number(row.attempts) + 1,
        phone,
      ]);
    }
    return false;
  }
  await queryDb("DELETE FROM otp_codes WHERE phone = $1", [phone]);
  return true;
}

export { OTP_MAX_ATTEMPTS };
