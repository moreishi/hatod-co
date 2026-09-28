export interface NearbyInput {
  lat: number;
  lng: number;
  radiusM: number;
}

export interface SqlQuery {
  text: string;
  values: [number, number, number];
}

const MIN_RADIUS_M = 500;
const MAX_RADIUS_M = 10000;

/**
 * Parameterized PostGIS query for dispatch matching.
 * Pure builder — execution lives in db.ts so this stays unit-testable without a DB.
 */
export function nearbyDriversQuery({ lat, lng, radiusM }: NearbyInput): SqlQuery {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error(`invalid lat: ${lat}`);
  if (!Number.isFinite(lng) || lng < -180 || lng > 180)
    throw new Error(`invalid lng: ${lng}`);
  const radius = Math.min(MAX_RADIUS_M, Math.max(MIN_RADIUS_M, Math.floor(radiusM)));
  return {
    text: `SELECT d.id, d.name, d.vehicle_type, d.plate_no,
  ST_Distance(l.geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS dist_m
FROM drivers_live l JOIN drivers d ON d.id = l.driver_id
WHERE d.status IN ('online', 'approved')
  AND ST_DWithin(l.geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
ORDER BY dist_m ASC LIMIT 20`,
    values: [lng, lat, radius],
  };
}
