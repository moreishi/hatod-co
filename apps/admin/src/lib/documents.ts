// Pure domain logic (client- + edge-safe): no node:* / DB imports.
// Repository functions live in ./driverDocs (server-only).
export const DOC_TYPES = [
  "license",
  "or_cr",
  "nbi",
  "pnp",
  "insurance",
  "vehicle_photo",
] as const;
export type DocType = (typeof DOC_TYPES)[number];

/** Types that carry an expiry date (renewal-tracked). */
const DATED: DocType[] = ["license", "or_cr", "nbi", "pnp", "insurance"];

export type DocStatus = "pending" | "verified" | "rejected";

export interface DriverDocument {
  id: string;
  driverId: string;
  type: DocType;
  fileKey: string;
  status: DocStatus;
  expiryDate: string | null;
  uploadedAt: string;
}

export function validateDocument(input: { type: string; expiryDate?: string }): {
  type: DocType;
  expiryDate: string | null;
} {
  if (!(DOC_TYPES as readonly string[]).includes(input.type))
    throw new Error(`unknown document type: ${input.type}`);
  const type = input.type as DocType;
  if (!DATED.includes(type)) return { type, expiryDate: null };
  if (!input.expiryDate || Number.isNaN(Date.parse(input.expiryDate)))
    throw new Error(`valid expiry date required for ${type}`);
  return { type, expiryDate: input.expiryDate.slice(0, 10) };
}

interface Dated {
  id: string;
  type: string;
  status: string;
  uploadedAt: string;
}

/** Renewal wins: newest verified row per type; pending never counts. */
export function latestVerified<T extends Dated>(docs: T[], type: string): T | null {
  const verified = docs
    .filter((d) => d.type === type && d.status === "verified")
    .sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
  return verified[0] ?? null;
}

export interface PendingRow {
  driverId: string;
  driverName: string;
  count: number;
}

/** Fleet inbox: pending docs grouped by driver, biggest pile first. */
export function summarizePending(
  docs: { driverId: string; driverName: string; status: string }[],
): PendingRow[] {
  const by = new Map<string, PendingRow>();
  for (const d of docs) {
    if (d.status !== "pending") continue;
    const row = by.get(d.driverId) ?? { driverId: d.driverId, driverName: d.driverName, count: 0 };
    row.count += 1;
    by.set(d.driverId, row);
  }
  return [...by.values()].sort((a, b) => b.count - a.count);
}
