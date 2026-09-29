import { describe, expect, it } from "vitest";
import { balanceDue, commissionFor, inPeriod, payoutForPeriod, summarizeTrips, COMMISSION_RATE } from "./earnings";
import type { Trip } from "./types";

function trip(over: Partial<Trip> = {}): Trip {
  return {
    id: "trip-1",
    zoneId: "gensan-downtown",
    riderName: "R. Garcia",
    driverId: "drv-001",
    status: "COMPLETED",
    pickup: "A",
    dropoff: "B",
    distanceM: 5000,
    durationS: 720,
    fareQuote: 124,
    payment: "cash",
    createdAt: new Date().toISOString(),
    ...over,
  };
}

describe("inPeriod (earnings filter)", () => {
  const trips = [
    trip({ id: "t1", createdAt: "2026-09-28T08:00:00Z" }),
    trip({ id: "t2", createdAt: "2026-09-20T08:00:00Z" }),
    trip({ id: "t3", createdAt: "2026-08-01T08:00:00Z" }),
  ];
  const now = new Date("2026-09-28T12:00:00Z");
  it("filters today / week / all", () => {
    expect(inPeriod(trips, "today", now).map((t) => t.id)).toEqual(["t1"]);
    expect(inPeriod(trips, "week", now).map((t) => t.id)).toEqual(["t1"]);
    expect(inPeriod(trips, "all", now).map((t) => t.id)).toEqual(["t1", "t2", "t3"]);
  });
  it("week reaches back 7 days", () => {
    expect(inPeriod(trips, "week", new Date("2026-09-26T12:00:00Z")).map((t) => t.id)).toEqual([
      "t2",
    ]);
  });
});

describe("payouts (period + balance)", () => {
  const trips = [
    trip({ id: "t1", fareQuote: 100, createdAt: "2026-09-01T10:00:00Z" }),
    trip({ id: "t2", fareQuote: 200, createdAt: "2026-09-20T10:00:00Z" }),
    trip({ id: "t3", fareQuote: 500, createdAt: "2026-10-01T10:00:00Z" }),
  ];
  it("sums net inside a period window", () => {
    const p = payoutForPeriod(trips, "2026-09-01", "2026-09-30");
    expect(p.rides).toBe(2);
    expect(p.net).toBe(300 - commissionFor(300));
  });
  it("balance subtracts what was already paid", () => {
    expect(balanceDue(1000, 400)).toBe(600);
    expect(balanceDue(100, 150)).toBe(0);
  });
});

describe("commissionFor", () => {
  it("takes the platform cut, rounded", () => {
    expect(commissionFor(100)).toBe(Math.round(100 * COMMISSION_RATE));
    expect(commissionFor(0)).toBe(0);
  });
});

describe("summarizeTrips (agency earnings)", () => {
  it("totals completed trips only, split by payment", () => {
    const s = summarizeTrips([
      trip({ fareQuote: 100, payment: "cash" }),
      trip({ fareQuote: 200, payment: "gcash" }),
      trip({ fareQuote: 999, payment: "cash", status: "CANCELLED" }),
    ]);
    expect(s.rides).toBe(2);
    expect(s.gross).toBe(300);
    expect(s.cash).toBe(100);
    expect(s.gcash).toBe(200);
    expect(s.commission).toBe(commissionFor(300));
    expect(s.net).toBe(300 - commissionFor(300));
  });

  it("handles empty input", () => {
    expect(summarizeTrips([])).toEqual({
      rides: 0,
      gross: 0,
      cash: 0,
      gcash: 0,
      commission: 0,
      net: 0,
    });
  });
});
