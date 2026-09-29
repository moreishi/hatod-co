import { VehicleType } from "@hailing/constants";
import { pricing } from "@hailing/data";

export interface FareInput {
  vehicleType: VehicleType;
  distanceKm: number;
}

/** Pure fare math — never hard-code fares (spec rule 37). Amounts in centavos. */
export function quoteFare({ vehicleType, distanceKm }: FareInput): {
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
