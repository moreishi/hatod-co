const EARTH_M = 6371000;

function rad(d: number): number {
  return (d * Math.PI) / 180;
}

/** Great-circle distance in meters. Dev fallback for PostGIS ST_Distance. */
export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  if (lat1 === lat2 && lng1 === lng2) return 0;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.sqrt(a));
}
