import type { TripStatus } from "./types";

const FLOW: Record<TripStatus, TripStatus[]> = {
  SEARCHING: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["ARRIVED", "CANCELLED"],
  ARRIVED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

/** Validated transition — terminal states locked, no skips. */
export function transitionTrip(from: TripStatus, to: TripStatus): TripStatus {
  if (!FLOW[from].includes(to)) {
    if (FLOW[from].length === 0) throw new Error(`trip is terminal (${from})`);
    throw new Error(`illegal transition ${from} → ${to}`);
  }
  return to;
}

/** Exactly the buttons a driver may press in each state. */
export function nextActions(status: TripStatus): TripStatus[] {
  return [...FLOW[status]];
}

export type TripFilter = "active" | "done" | "all";

/** History tabs: active rides vs finished (completed/cancelled) vs everything. */
export function filterTrips<T extends { status: string }>(trips: T[], filter: TripFilter): T[] {
  if (filter === "all") return trips;
  const active = (s: string) => ["SEARCHING", "ACCEPTED", "ARRIVED", "IN_PROGRESS"].includes(s);
  return trips.filter((t) => (filter === "active" ? active(t.status) : !active(t.status)));
}
