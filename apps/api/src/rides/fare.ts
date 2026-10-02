import { VehicleType } from "@hailing/constants";
import { pricing as staticPricing } from "@hailing/data";

export interface FareInput {
  vehicleType: VehicleType;
  distanceKm: number;
}

/** A fare table: either the static pilot JSON or one DB FareSchedule row. */
export interface FarePricing {
  baseFareCentavos: number;
  minimumFareCentavos: number;
  perKmCentavos: Record<string, number>;
  commissionTiers: { rateBps: number }[];
}

/** Pure fare math — never hard-code fares (spec rule 37). Amounts in centavos. */
export function quoteFare({
  vehicleType,
  distanceKm,
  pricing = staticPricing,
}: FareInput & { pricing?: FarePricing }): {
  fareCentavos: number;
  commissionCentavos: number;
  driverCentavos: number;
} {
  const perKm = pricing.perKmCentavos[vehicleType];
  if (perKm === undefined)
    throw new Error(`unknown vehicle type ${vehicleType}`);
  const fareCentavos = Math.max(
    pricing.minimumFareCentavos,
    pricing.baseFareCentavos + Math.round(distanceKm * perKm),
  );
  const commissionCentavos = Math.round(
    (fareCentavos * pricing.commissionTiers[0].rateBps) / 10000,
  );
  return {
    fareCentavos,
    commissionCentavos,
    driverCentavos: fareCentavos - commissionCentavos,
  };
}

/** Every fleet fare off one distance — one route, N prices, no extra routing. */
export function quoteAllFares({
  distanceKm,
  pricing,
}: {
  distanceKm: number;
  pricing?: FarePricing;
}): Record<VehicleType, number> {
  return Object.fromEntries(
    Object.values(VehicleType).map((vehicleType) => [
      vehicleType,
      quoteFare({ vehicleType, distanceKm, pricing }).fareCentavos,
    ]),
  ) as Record<VehicleType, number>;
}
