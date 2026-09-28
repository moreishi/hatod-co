import type { ZonePricing } from "./types";

export interface FareInput {
  distanceM: number;
  durationS: number;
  pricing: ZonePricing;
}

/** Pure fare engine — must stay in sync with backend/Edge Function. */
export function calculateFare({ distanceM, durationS, pricing }: FareInput): number {
  if (distanceM < 0 || durationS < 0) throw new Error("distance/duration must be >= 0");
  const km = distanceM / 1000;
  const min = durationS / 60;
  const raw = pricing.base + km * pricing.perKm + min * pricing.perMin;
  return Math.max(Math.round(raw), pricing.minimum);
}
