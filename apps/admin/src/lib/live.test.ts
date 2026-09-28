import { describe, expect, it } from "vitest";
import { splitFleet } from "./earnings";

const drivers = [
  { id: "d1", name: "Ana", status: "online" },
  { id: "d2", name: "Ben", status: "online" },
  { id: "d3", name: "Cy", status: "offline" },
];
const trips = [
  { id: "t1", driverId: "d1", status: "IN_PROGRESS", pickup: "A", dropoff: "B" },
  { id: "t2", driverId: "d1", status: "COMPLETED", pickup: "A", dropoff: "B" },
];

describe("splitFleet (live view)", () => {
  it("pairs on-trip drivers with their active trip, rest are idle", () => {
    const live = splitFleet(drivers as never, trips as never);
    expect(live.onTrip.map((x) => x.driver.id)).toEqual(["d1"]);
    expect(live.onTrip[0].trip.id).toBe("t1");
    expect(live.idle.map((d) => d.id)).toEqual(["d2"]);
  });

  it("is empty when nobody is online", () => {
    expect(splitFleet([], [])).toEqual({ onTrip: [], idle: [] });
  });
});
