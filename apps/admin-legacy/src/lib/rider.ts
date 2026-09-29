import type { Rider } from "./types";

export interface BookResult {
  ok: boolean;
  reason?: string;
}

/** Rider gate: suspended or phoneless riders cannot book. */
export function canBook(r: Rider): BookResult {
  if (!r.phone || r.phone.trim() === "") return { ok: false, reason: "missing phone" };
  if (r.status === "suspended") return { ok: false, reason: "rider suspended" };
  return { ok: true };
}
