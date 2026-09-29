import { describe, expect, it } from "vitest";
import { RideTransitionGuard } from "../src/rides/ride-transition.guard.js";

const guard = new RideTransitionGuard();

describe("RideTransitionGuard (spec §31)", () => {
  it("allows the happy path REQUESTED -> ASSIGNED -> … -> COMPLETED", () => {
    const path = [
      "REQUESTED",
      "ASSIGNED",
      "DRIVER_EN_ROUTE",
      "DRIVER_ARRIVED",
      "IN_PROGRESS",
      "COMPLETED",
    ] as const;
    for (let i = 0; i < path.length - 1; i += 1) {
      expect(guard.canTransition(path[i], path[i + 1])).toBe(true);
    }
  });

  it("rejects skipping states (REQUESTED -> IN_PROGRESS)", () => {
    expect(guard.canTransition("REQUESTED", "IN_PROGRESS")).toBe(false);
    expect(() => guard.assertTransition("REQUESTED", "IN_PROGRESS")).toThrow(
      "Illegal ride transition",
    );
  });

  it("makes terminal states final", () => {
    for (const terminal of ["COMPLETED", "CANCELLED"] as const) {
      expect(guard.canTransition(terminal, "REQUESTED")).toBe(false);
    }
  });
});
