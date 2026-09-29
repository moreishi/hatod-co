/**
 * @hailing/data — compiled entry for geography + reference datasets.
 * Spec §11, §12: apps import datasets from here, never from relative paths
 * and never by duplicating lists. Codes are identifiers; names are display.
 */
import cebu from "../geography/cebu.json" with { type: "json" };
import philippines from "../geography/philippines.json" with { type: "json" };
import documentRequirements from "../reference/document-requirements.json" with { type: "json" };
import pricing from "../reference/pricing.json" with { type: "json" };

export { cebu, philippines, pricing, documentRequirements };

export interface BarangayRef {
  code: string;
  name: string;
}

export interface CityRef {
  code: string;
  name: string;
  parent: string;
  barangays: BarangayRef[];
}

/** Every code known to the pilot geography (province + cities + barangays). */
export function allCebuCodes(): Set<string> {
  const typed = cebu as { province: { code: string }; cities: CityRef[] };
  return new Set([
    typed.province.code,
    ...typed.cities.map((c) => c.code),
    ...typed.cities.flatMap((c) => c.barangays.map((b) => b.code)),
  ]);
}
