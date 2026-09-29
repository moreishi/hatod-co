import { describe, expect, it, vi } from "vitest";
import { RideEventsGateway } from "../src/realtime/ride-events.gateway.js";

function gatewayWith() {
  const emit = vi.fn();
  const to = vi.fn().mockReturnValue({ emit });
  const server = { to };
  const gateway = new RideEventsGateway();
  (gateway as unknown as { server: unknown }).server = server;
  return { gateway, to, emit };
}

describe("RideEventsGateway (RED: not implemented yet)", () => {
  it("broadcasts ride updates to the ride room", () => {
    const { gateway, to, emit } = gatewayWith();
    gateway.broadcastRide({
      rideId: "ride-1",
      status: "ASSIGNED",
      agencyId: "ag-1",
      driverId: "d-1",
    });
    expect(to).toHaveBeenCalledWith("ride:ride-1");
    expect(emit).toHaveBeenCalledWith(
      "ride.updated",
      expect.objectContaining({ rideId: "ride-1", status: "ASSIGNED" }),
    );
  });

  it("broadcasts dispatch events to the agency room", () => {
    const { gateway, to, emit } = gatewayWith();
    gateway.broadcastRide({
      rideId: "ride-1",
      status: "REQUESTED",
      agencyId: "ag-1",
      driverId: null,
    });
    expect(to).toHaveBeenCalledWith("agency:ag-1");
    expect(emit).toHaveBeenCalledWith(
      "dispatch.updated",
      expect.objectContaining({ rideId: "ride-1" }),
    );
  });
});
