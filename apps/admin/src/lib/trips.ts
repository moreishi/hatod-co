import { insertQuery } from "./repo";
import { queryDb } from "./db";
import { transitionTrip } from "./tripflow";
import type { Trip, TripStatus } from "./types";

export { nextActions, transitionTrip } from "./tripflow";

function rowToTrip(row: Record<string, unknown>): Trip {
  return {
    id: String(row.id),
    zoneId: String(row.zone_id),
    riderName: String(row.rider_name),
    riderId: row.rider_id == null ? null : String(row.rider_id),
    driverId: row.driver_id == null ? null : String(row.driver_id),
    status: row.status as TripStatus,
    pickup: String(row.pickup),
    dropoff: String(row.dropoff),
    distanceM: Number(row.distance_m),
    durationS: Number(row.duration_s),
    fareQuote: Number(row.fare_quote),
    payment: row.payment as Trip["payment"],
    paid: row.paid === true || row.paid === 1,
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

export async function getTrip(id: string): Promise<Trip | null> {
  const rows = await queryDb<Record<string, unknown>>("SELECT * FROM trips WHERE id = $1", [id]);
  return rows.length > 0 ? rowToTrip(rows[0]) : null;
}

/** Ops board: every trip, newest first. */
export async function listAllTrips(limit = 100): Promise<Trip[]> {
  const rows = await queryDb<Record<string, unknown>>(
    "SELECT * FROM trips ORDER BY created_at DESC LIMIT $1",
    [limit],
  );
  return rows.map(rowToTrip);
}

/** Driver's current ride: newest non-terminal trip. */
export async function getActiveTrip(driverId: string): Promise<Trip | null> {
  const rows = await queryDb<Record<string, unknown>>(
    `SELECT * FROM trips WHERE driver_id = $1 AND status NOT IN ('COMPLETED','CANCELLED')
     ORDER BY created_at DESC LIMIT 1`,
    [driverId],
  );
  return rows.length > 0 ? rowToTrip(rows[0]) : null;
}

/** Open dispatch pool: SEARCHING trips with no driver (first-come accept). */
export async function listOpenOffers(limit = 20): Promise<Trip[]> {
  const rows = await queryDb<Record<string, unknown>>(
    `SELECT * FROM trips WHERE status = 'SEARCHING' AND driver_id IS NULL
     ORDER BY created_at DESC LIMIT $1`,
    [limit],
  );
  return rows.map(rowToTrip);
}

export async function setTripStatus(id: string, to: TripStatus): Promise<Trip> {
  const current = await getTrip(id);
  if (!current) throw new Error("trip not found");
  transitionTrip(current.status, to);
  const rows = await queryDb<Record<string, unknown>>(
    "UPDATE trips SET status = $1 WHERE id = $2 RETURNING *",
    [to, id],
  );
  return rowToTrip(rows[0]);
}

/** Accept an open offer: claim + move to ACCEPTED atomically-ish (pilot scale). */
export async function acceptOffer(tripId: string, driverId: string): Promise<Trip> {
  const current = await getTrip(tripId);
  if (!current) throw new Error("trip not found");
  if (current.status !== "SEARCHING" || current.driverId)
    throw new Error("offer no longer available");
  const rows = await queryDb<Record<string, unknown>>(
    `UPDATE trips SET driver_id = $1, status = 'ACCEPTED'
     WHERE id = $2 AND status = 'SEARCHING' AND driver_id IS NULL RETURNING *`,
    [driverId, tripId],
  );
  if (rows.length === 0) throw new Error("offer no longer available");
  return rowToTrip(rows[0]);
}

export async function createTrip(input: {
  zoneId: string;
  riderName: string;
  riderId?: string | null;
  pickup: string;
  dropoff: string;
  distanceM: number;
  durationS: number;
  fareQuote: number;
  payment: "cash" | "gcash";
}): Promise<Trip> {
  // Business policy: cash only until e-wallets launch (PayMongo lib is ready).
  if (input.payment !== "cash") throw new Error("cash only for now — GCash coming later");
  const q = insertQuery(
    "trips",
    ["id", "zone_id", "rider_name", "rider_id", "driver_id", "status", "pickup", "dropoff", "distance_m", "duration_s", "fare_quote", "payment"],
    {
      id: `trip-${Date.now()}`,
      zone_id: input.zoneId,
      rider_name: input.riderName,
      rider_id: input.riderId ?? null,
      driver_id: null,
      status: "SEARCHING",
      pickup: input.pickup,
      dropoff: input.dropoff,
      distance_m: input.distanceM,
      duration_s: input.durationS,
      fare_quote: input.fareQuote,
      payment: input.payment,
    },
  );
  const rows = await queryDb<Record<string, unknown>>(q.text, q.values);
  return rowToTrip(rows[0]);
}
