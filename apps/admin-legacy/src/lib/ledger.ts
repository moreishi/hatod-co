import { insertQuery } from "./repo";
import { queryDb } from "./db";
import type { AgencyTrip } from "./earnings";

function rowToTrip(row: Record<string, unknown>): AgencyTrip {
  return {
    id: String(row.id),
    zoneId: String(row.zone_id),
    riderName: String(row.rider_name),
    driverId: row.driver_id == null ? null : String(row.driver_id),
    status: row.status as AgencyTrip["status"],
    pickup: String(row.pickup),
    dropoff: String(row.dropoff),
    distanceM: Number(row.distance_m),
    durationS: Number(row.duration_s),
    fareQuote: Number(row.fare_quote),
    payment: row.payment as AgencyTrip["payment"],
    paid: row.paid === true || row.paid === 1,
    createdAt: new Date(row.created_at as string).toISOString(),
    driverName: String(row.driver_name ?? "?"),
  };
}

/** Completed + active trips of one agency's fleet (via drivers.agency_user_id). */
export async function listAgencyTrips(agencyUserId: string): Promise<AgencyTrip[]> {
  const rows = await queryDb<Record<string, unknown>>(
    `SELECT t.*, d.name AS driver_name FROM trips t
     JOIN drivers d ON d.id = t.driver_id
     WHERE d.agency_user_id = $1 ORDER BY t.created_at DESC LIMIT 200`,
    [agencyUserId],
  );
  return rows.map(rowToTrip);
}

/** One driver's own trips, newest first. */
export async function listDriverTrips(driverId: string): Promise<AgencyTrip[]> {
  const rows = await queryDb<Record<string, unknown>>(
    `SELECT t.*, d.name AS driver_name FROM trips t
     JOIN drivers d ON d.id = t.driver_id
     WHERE t.driver_id = $1 ORDER BY t.created_at DESC LIMIT 100`,
    [driverId],
  );
  return rows.map(rowToTrip);
}

export interface Payout {
  id: string;
  agencyUserId: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  status: string;
  createdAt: string;
}

export async function listPayouts(agencyUserId: string): Promise<Payout[]> {
  const rows = await queryDb<Record<string, unknown>>(
    "SELECT * FROM payouts WHERE agency_user_id = $1 ORDER BY created_at DESC",
    [agencyUserId],
  );
  return rows.map((r) => ({
    id: String(r.id),
    agencyUserId: String(r.agency_user_id),
    periodStart: String(r.period_start).slice(0, 10),
    periodEnd: String(r.period_end).slice(0, 10),
    amount: Number(r.amount),
    status: String(r.status),
    createdAt: new Date(r.created_at as string).toISOString(),
  }));
}

export async function recordPayout(
  agencyUserId: string,
  periodStart: string,
  periodEnd: string,
  amount: number,
): Promise<Payout> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodStart) || !/^\d{4}-\d{2}-\d{2}$/.test(periodEnd))
    throw new Error("period must be YYYY-MM-DD");
  if (periodStart > periodEnd) throw new Error("period start after end");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("amount must be positive");
  const q = insertQuery(
    "payouts",
    ["id", "agency_user_id", "period_start", "period_end", "amount", "status"],
    {
      id: `pay-${Date.now()}`,
      agency_user_id: agencyUserId,
      period_start: periodStart,
      period_end: periodEnd,
      amount: Math.round(amount),
      status: "paid",
    },
  );
  const rows = await queryDb<Record<string, unknown>>(q.text, q.values);
  const r = rows[0];
  return {
    id: String(r.id),
    agencyUserId: String(r.agency_user_id),
    periodStart: String(r.period_start).slice(0, 10),
    periodEnd: String(r.period_end).slice(0, 10),
    amount: Number(r.amount),
    status: String(r.status),
    createdAt: new Date(r.created_at as string).toISOString(),
  };
}
