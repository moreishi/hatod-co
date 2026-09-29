import { queryDb } from "./db";
import { updateQuery } from "./repo";
import type { Zone, ZonePricing } from "./types";

export interface ZonePricingInput {
  base: number;
  perKm: number;
  perMin: number;
  minimum: number;
}

/** Fares stay non-negative and the minimum never undercuts the base. */
export function validateZonePricing(input: {
  base: number;
  perKm: number;
  perMin: number;
  minimum: number;
}): ZonePricing {
  for (const k of ["base", "perKm", "perMin", "minimum"] as const) {
    const v = input[k];
    if (!Number.isFinite(v) || v < 0) throw new Error(`${k} must be >= 0`);
  }
  if (input.minimum < input.base) throw new Error("minimum cannot be below base fare");
  return { ...input };
}

function rowToZone(row: Record<string, unknown>): Zone {
  return {
    id: String(row.id),
    name: String(row.name),
    pricing: {
      base: Number(row.base_fare),
      perKm: Number(row.per_km),
      perMin: Number(row.per_min),
      minimum: Number(row.minimum),
    },
    cashEnabled: row.cash_enabled === true || row.cash_enabled === 1,
    gcashEnabled: row.gcash_enabled === true || row.gcash_enabled === 1,
  };
}

export async function listZones(): Promise<Zone[]> {
  const rows = await queryDb<Record<string, unknown>>("SELECT * FROM zones ORDER BY name ASC", []);
  return rows.map(rowToZone);
}

export async function updateZonePricing(
  id: string,
  pricing: ZonePricingInput,
): Promise<Zone> {
  const clean = validateZonePricing(pricing);
  const q = updateQuery("zones", ["base_fare", "per_km", "per_min", "minimum"], id, {
    base_fare: clean.base,
    per_km: clean.perKm,
    per_min: clean.perMin,
    minimum: clean.minimum,
  });
  const rows = await queryDb<Record<string, unknown>>(q.text, q.values);
  if (rows.length === 0) throw new Error("zone not found");
  return rowToZone(rows[0]);
}
