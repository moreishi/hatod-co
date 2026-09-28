import type { Driver } from "./types";

export interface ComplianceResult {
  ok: boolean;
  reason?: string;
}

/** LTFRB gate: expired PA or CPC blocks Go-online. Expiring-soon only warns. */
export function canGoOnline(d: Driver, now: Date = new Date()): ComplianceResult {
  if (new Date(d.docs.paExpiry).getTime() < now.getTime())
    return { ok: false, reason: `PA expired ${d.docs.paExpiry}` };
  if (new Date(d.docs.cpcExpiry).getTime() < now.getTime())
    return { ok: false, reason: `CPC expired ${d.docs.cpcExpiry}` };
  return { ok: true };
}
