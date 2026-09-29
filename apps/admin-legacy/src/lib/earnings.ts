// Pure earnings math (client- + edge-safe): no node:* / DB imports.
// Repository functions live in ./ledger (server-only).
import type { Trip } from "./types";

/** Platform commission on every completed ride. */
export const COMMISSION_RATE = 0.15;

export function commissionFor(fare: number): number {
  if (fare <= 0) return 0;
  return Math.round(fare * COMMISSION_RATE);
}

export interface EarningsSummary {
  rides: number;
  gross: number;
  cash: number;
  gcash: number;
  commission: number;
  net: number;
}

/** Net inside an inclusive date window (YYYY-MM-DD), for payout periods. */
export function payoutForPeriod(
  trips: Trip[],
  start: string,
  end: string,
): EarningsSummary {
  const inWindow = trips.filter((t) => {
    const day = t.createdAt.slice(0, 10);
    return day >= start && day <= end;
  });
  return summarizeTrips(inWindow);
}

/** Balance owed after recorded payouts — never negative. */
export function balanceDue(net: number, paid: number): number {
  return Math.max(0, net - paid);
}

export type EarningsPeriod = "today" | "week" | "all";

/** Driver-facing filter: today / last 7 days / all time. */
export function inPeriod<T extends { createdAt: string }>(
  trips: T[],
  period: EarningsPeriod,
  now: Date = new Date(),
): T[] {
  if (period === "all") return trips;
  const day = (d: Date) => d.toISOString().slice(0, 10);
  const today = day(now);
  if (period === "today") return trips.filter((t) => t.createdAt.slice(0, 10) === today);
  const weekAgo = new Date(now.getTime() - 7 * 86400_000);
  return trips.filter((t) => {
    const c = t.createdAt.slice(0, 10);
    return c <= today && c >= day(weekAgo);
  });
}

const ACTIVE = ["ACCEPTED", "ARRIVED", "IN_PROGRESS"];

export interface LivePair {
  driver: { id: string; name: string; status: string };
  trip: { id: string; status: string; pickup: string; dropoff: string };
}

/** Live view: on-trip drivers paired with their active trip, everyone else idle. */
export function splitFleet(
  drivers: { id: string; name: string; status: string }[],
  trips: { id: string; driverId: string | null; status: string; pickup: string; dropoff: string }[],
): { onTrip: LivePair[]; idle: { id: string; name: string; status: string }[] } {
  const activeByDriver = new Map<string, (typeof trips)[number]>();
  for (const t of trips) {
    if (t.driverId && ACTIVE.includes(t.status) && !activeByDriver.has(t.driverId))
      activeByDriver.set(t.driverId, t);
  }
  const onTrip: LivePair[] = [];
  const idle: { id: string; name: string; status: string }[] = [];
  for (const d of drivers) {
    if (d.status !== "online") continue;
    const trip = activeByDriver.get(d.id);
    if (trip)
      onTrip.push({
        driver: d,
        trip: { id: trip.id, status: trip.status, pickup: trip.pickup, dropoff: trip.dropoff },
      });
    else idle.push(d);
  }
  return { onTrip, idle };
}

/** Agency earnings over COMPLETED trips only. */
export function summarizeTrips(trips: Trip[]): EarningsSummary {
  const done = trips.filter((t) => t.status === "COMPLETED");
  const gross = done.reduce((n, t) => n + t.fareQuote, 0);
  const cash = done.filter((t) => t.payment === "cash").reduce((n, t) => n + t.fareQuote, 0);
  const gcash = gross - cash;
  const commission = commissionFor(gross);
  return { rides: done.length, gross, cash, gcash, commission, net: gross - commission };
}

export interface AgencyTrip extends Trip {
  driverName: string;
}
