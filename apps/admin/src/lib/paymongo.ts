import { createHmac, timingSafeEqual } from "node:crypto";

/** PayMongo GCash e-wallet rate. */
export const GCASH_FEE_RATE = 0.0223;

export function gcashFee(centavos: number): number {
  return Math.round(centavos * GCASH_FEE_RATE);
}

export interface LinkInput {
  tripId: string;
  fare: number; // PHP pesos
  riderName: string;
}

/** POST /v1/payment_links body: centavos, PHP, trip tagged in metadata. */
export function buildPaymentLinkPayload(input: LinkInput): {
  amount: number;
  currency: "PHP";
  description: string;
  metadata: { trip_id: string };
} {
  const amount = Math.round(input.fare * 100);
  if (amount < 100) throw new Error("amount below PayMongo minimum (PHP 1.00)");
  return {
    amount,
    currency: "PHP",
    description: `Hatod ride ${input.tripId} — ${input.riderName}`.slice(0, 200),
    metadata: { trip_id: input.tripId },
  };
}

function parseHeader(header: string): { t: string; te: string; li: string } | null {
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=");
      return i < 0 ? [p.trim(), ""] : [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  );
  if (!parts.t || !("te" in parts) || !("li" in parts)) return null;
  return { t: parts.t, te: parts.te, li: parts.li };
}

/**
 * Verify a PayMongo webhook: HMAC-SHA256(`${t}.${rawBody}`, secret),
 * compared against te (test) or li (live). Raw body — never parsed first.
 */
export function verifyWebhookSignature(
  rawBody: string,
  header: string,
  secret: string,
  livemode: boolean,
): boolean {
  try {
    const parsed = parseHeader(header);
    if (!parsed) return false;
    const want = livemode ? parsed.li : parsed.te;
    if (!want) return false;
    const got = createHmac("sha256", secret).update(`${parsed.t}.${rawBody}`).digest("hex");
    const a = Buffer.from(got);
    const b = Buffer.from(want);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export interface PayMongoLink {
  id: string;
  url: string;
  reference: string;
}

/** Create a shareable GCash checkout link. Throws when keys are absent. */
export async function createPaymentLink(input: LinkInput): Promise<PayMongoLink> {
  const key = process.env.PAYMONGO_SECRET_KEY ?? "";
  if (!key) throw new Error("PAYMONGO_SECRET_KEY is not set");
  const res = await fetch("https://api.paymongo.com/v1/payment_links", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildPaymentLinkPayload(input)),
  });
  if (!res.ok) throw new Error(`PayMongo rejected link creation (${res.status})`);
  const body = (await res.json()) as {
    data: { id: string; url: string; reference_number: string };
  };
  return { id: body.data.id, url: body.data.url, reference: body.data.reference_number };
}
