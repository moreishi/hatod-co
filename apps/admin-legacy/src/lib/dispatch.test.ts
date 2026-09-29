import { describe, expect, it } from "vitest";
import { nearbyDriversQuery } from "./dispatch";

describe("nearbyDriversQuery (PostGIS dispatch)", () => {
  it("builds a parameterized ST_DWithin query", () => {
    const q = nearbyDriversQuery({ lat: 6.1164, lng: 125.1712, radiusM: 3000 });
    expect(q.text).toMatch(/ST_DWithin/);
    expect(q.text).toMatch(/ORDER BY dist_m/);
    expect(q.values).toEqual([125.1712, 6.1164, 3000]);
  });

  it("clamps radius to 500–10000m", () => {
    expect(nearbyDriversQuery({ lat: 6.1, lng: 125.1, radiusM: 50 }).values[2]).toBe(500);
    expect(nearbyDriversQuery({ lat: 6.1, lng: 125.1, radiusM: 999999 }).values[2]).toBe(
      10000,
    );
  });

  it("rejects out-of-range coordinates", () => {
    expect(() => nearbyDriversQuery({ lat: 91, lng: 125.1, radiusM: 3000 })).toThrow(/lat/i);
    expect(() => nearbyDriversQuery({ lat: 6.1, lng: 200, radiusM: 3000 })).toThrow(/lng/i);
  });

  it("only matches online/approved drivers", () => {
    const q = nearbyDriversQuery({ lat: 6.1, lng: 125.1, radiusM: 3000 });
    expect(q.text).toMatch(/online/);
    expect(q.text).toMatch(/approved/);
  });
});
