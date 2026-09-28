"use server";

import { requestOtp } from "@/lib/otpStore";

/** Public: send a sign-in code. Throttled per phone (SMS costs money). */
export async function requestOtpAction(
  phone: string,
): Promise<{ ok: boolean; error?: string; retryAfterS?: number }> {
  try {
    const r = await requestOtp(phone);
    if (r.retryAfterS) return { ok: false, retryAfterS: r.retryAfterS };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "could not send code" };
  }
}
