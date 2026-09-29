export interface SmsResult {
  ok: boolean;
  provider: "console" | "semaphore";
}

/** Dev fallback: prints the code to the server console. NEVER in prod. */
class ConsoleSms {
  async send(phone: string, code: string): Promise<SmsResult> {
    console.log(`[hatod dev-sms] OTP for ${phone}: ${code}`);
    return { ok: true, provider: "console" };
  }
}

/** Semaphore (PH): https://api.semaphore.co/api/v4/messages */
class SemaphoreSms {
  async send(phone: string, code: string): Promise<SmsResult> {
    const key = process.env.SEMAPHORE_API_KEY ?? "";
    if (!key) throw new Error("SEMAPHORE_API_KEY is not set");
    const res = await fetch("https://api.semaphore.co/api/v4/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apikey: key,
        number: phone,
        message: `Your Hatod code is ${code}. Valid for 5 minutes.`,
      }),
    });
    if (!res.ok) throw new Error(`Semaphore rejected SMS (${res.status})`);
    return { ok: true, provider: "semaphore" };
  }
}

/** Real SMS when SEMAPHORE_API_KEY is set, else console (dev only). */
export function getSms(): { send(phone: string, code: string): Promise<SmsResult> } {
  if (process.env.SEMAPHORE_API_KEY) return new SemaphoreSms();
  return new ConsoleSms();
}
