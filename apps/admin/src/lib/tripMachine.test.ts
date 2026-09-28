import { describe, expect, it } from "vitest";
import { filterTrips, nextActions, transitionTrip } from "./tripflow";
import { createTrip } from "./trips";

describe("transitionTrip (ride state machine)", () => {
  it("walks the happy path", () => {
    expect(transitionTrip("SEARCHING", "ACCEPTED")).toBe("ACCEPTED");
    expect(transitionTrip("ACCEPTED", "ARRIVED")).toBe("ARRIVED");
    expect(transitionTrip("ARRIVED", "IN_PROGRESS")).toBe("IN_PROGRESS");
    expect(transitionTrip("IN_PROGRESS", "COMPLETED")).toBe("COMPLETED");
  });

  it("allows cancellation before completion", () => {
    for (const s of ["SEARCHING", "ACCEPTED", "ARRIVED"] as const)
      expect(transitionTrip(s, "CANCELLED")).toBe("CANCELLED");
  });

  it("locks terminal states and rejects skips", () => {
    expect(() => transitionTrip("COMPLETED", "CANCELLED")).toThrow(/terminal/i);
    expect(() => transitionTrip("CANCELLED", "ACCEPTED")).toThrow(/terminal/i);
    expect(() => transitionTrip("SEARCHING", "COMPLETED")).toThrow(/transition/i);
    expect(() => transitionTrip("ACCEPTED", "IN_PROGRESS")).toThrow(/transition/i);
  });
});

describe("nextActions (driver buttons)", () => {
  it("offers exactly the legal moves per state", () => {
    expect(nextActions("SEARCHING")).toEqual(["ACCEPTED", "CANCELLED"]);
    expect(nextActions("ACCEPTED")).toEqual(["ARRIVED", "CANCELLED"]);
    expect(nextActions("ARRIVED")).toEqual(["IN_PROGRESS", "CANCELLED"]);
    expect(nextActions("IN_PROGRESS")).toEqual(["COMPLETED"]);
    expect(nextActions("COMPLETED")).toEqual([]);
    expect(nextActions("CANCELLED")).toEqual([]);
  });
});

describe("filterTrips (history tabs)", () => {  const trips = [
    { id: "t1", status: "IN_PROGRESS" },
    { id: "t2", status: "COMPLETED" },
    { id: "t3", status: "CANCELLED" },
  ];
  it("splits active / done / all", () => {
    expect(filterTrips(trips as never, "active").map((t) => t.id)).toEqual(["t1"]);
    expect(filterTrips(trips as never, "done").map((t) => t.id)).toEqual(["t2", "t3"]);
    expect(filterTrips(trips as never, "all").map((t) => t.id)).toEqual(["t1", "t2", "t3"]);
  });
});

describe("cash-only policy (GCash parked)", () => {
  const base = {
    zoneId: "gensan-downtown",
    riderName: "R",
    pickup: "A",
    dropoff: "B",
    distanceM: 1000,
    durationS: 300,
    fareQuote: 60,
  };
  it("rejects non-cash trips until e-wallets launch", async () => {
    await expect(createTrip({ ...base, payment: "gcash" })).rejects.toThrow(/cash/i);
  });
});
