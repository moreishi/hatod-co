import { randomInt } from "node:crypto";

export const OTP_TTL_MS = 5 * 60_000;
export const OTP_RESEND_MS = 60_000;
export const OTP_MAX_ATTEMPTS = 5;

export interface OtpRecord {
  phone: string;
  codeHash: string;
  expiresAt: string;
  attempts: number;
  requestedAt: string;
}

/** 6-digit code. crypto-random; logged to console in dev, SMS in prod. */
export function buildOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export interface Throttle {
  ok: boolean;
  retryAfterS?: number;
}

/** SMS money guard: one code per phone per minute (resend replaces). */
export function otpThrottle(
  last: Pick<OtpRecord, "requestedAt"> | null,
  now: Date = new Date(),
): Throttle {
  if (!last) return { ok: true };
  const elapsed = now.getTime() - new Date(last.requestedAt).getTime();
  if (elapsed < OTP_RESEND_MS)
    return { ok: false, retryAfterS: Math.ceil((OTP_RESEND_MS - elapsed) / 1000) };
  return { ok: true };
}

export interface Attempt {
  ok: boolean;
  locked?: boolean;
}

/** Verify path: expiry first, then attempt budget (5 wrong = locked). */
export function verifyOtpAttempt(
  record: OtpRecord,
  match: boolean,
  now: Date = new Date(),
): Attempt {
  if (new Date(record.expiresAt).getTime() < now.getTime()) return { ok: false };
  if (record.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, locked: true };
  if (!match) return { ok: false, locked: record.attempts + 1 >= OTP_MAX_ATTEMPTS };
  return { ok: true };
}
