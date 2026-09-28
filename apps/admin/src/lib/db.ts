import postgres from "postgres";
import { nearbyDriversQuery } from "./dispatch";
import { haversineM } from "./geo";
import { toSqlite } from "./repo";
import { getDevDb } from "./sqlite";

// Postgres is prod. SQLite (node:sqlite, zero-install) is dev-only.
// Module import never connects — clients are created lazily per call path.
let _pg: ReturnType<typeof postgres> | null = null;

export function hasDb(): boolean {
  return !!process.env.DATABASE_URL;
}

function pg() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  if (!_pg) _pg = postgres(process.env.DATABASE_URL, { idle_timeout: 20, max: 5 });
  return _pg;
}

/**
 * Every $n must have exactly one bound value on BOTH dialects: Postgres
 * reuses numbers but SQLite expands them positionally, so a reused $n with
 * a single value silently mis-binds. Fail loud instead of wrong rows.
 */
export function checkBindings(text: string, values: unknown[]): void {
  const all = text.match(/\$\d+/g) ?? [];
  const distinct = new Set(all);
  const max = distinct.size === 0 ? 0 : Math.max(...[...distinct].map((s) => Number(s.slice(1))));
  // $1..$n each exactly once: Postgres-safe AND SQLite-safe (which expands positionally).
  if (all.length !== values.length || max !== values.length || distinct.size !== values.length)
    throw new Error(`binding mismatch: "${text.slice(0, 60)}…" has ${all.length} slots for ${values.length} values`);
}

/** Run parameterized SQL on Postgres ($n) or dev SQLite (?) — same row shape. */
export async function queryDb<T>(text: string, values: unknown[]): Promise<T[]> {
  checkBindings(text, values);
  if (hasDb()) {
    return (await pg().unsafe(
      text,
      values as (string | number)[],
    )) as unknown as Promise<T[]>;
  }
  const rows = getDevDb()
    .prepare(toSqlite(text))
    .all(...(values as (string | number | null)[]));
  return rows as T[];
}

export interface NearbyDriver {
  id: string;
  name: string;
  vehicle_type: string;
  plate_no: string;
  dist_m: number;
}

export async function findNearbyDrivers(
  lat: number,
  lng: number,
  radiusM = 3000,
): Promise<NearbyDriver[]> {
  const q = nearbyDriversQuery({ lat, lng, radiusM }); // validates + clamps
  if (hasDb()) {
    return queryDb<NearbyDriver>(q.text, q.values);
  }
  // Dev fallback: JS haversine over live positions (pilot-scale only)
  const rows = getDevDb()
    .prepare(
      `SELECT d.id, d.name, d.vehicle_type, d.plate_no, l.lat, l.lng
       FROM drivers_live l JOIN drivers d ON d.id = l.driver_id
       WHERE d.status IN ('online', 'approved')`,
    )
    .all() as unknown as (NearbyDriver & { lat: number; lng: number })[];
  return rows
    .map((r) => ({ ...r, dist_m: haversineM(lat, lng, r.lat, r.lng) }))
    .filter((r) => r.dist_m <= (q.values[2] as number))
    .sort((a, b) => a.dist_m - b.dist_m)
    .slice(0, 20);
}
