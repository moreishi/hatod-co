import { describe, expect, it } from "vitest";
import { fleetAlerts, type AlertInput } from "./alerts";

function doc(over: Partial<AlertInput["docs"][number]> = {}) {
  return {
    type: "license",
    status: "verified",
    expiryDate: "2027-01-01",
    ...over,
  } as AlertInput["docs"][number];
}

describe("fleetAlerts", () => {
  it("flags expiring docs, rejected docs, and suspended drivers", () => {
    const alerts = fleetAlerts(
      {
        drivers: [
          { id: "d1", name: "Ana", status: "online" },
          { id: "d2", name: "Ben", status: "suspended" },
        ],
        docs: [
          { driverId: "d1", driverName: "Ana", docs: [doc({ expiryDate: "2026-10-10" })] },
        ],
        pendingDocs: 2,
        now: new Date("2026-09-28"),
      },
    );
    const kinds = alerts.map((a) => a.kind);
    expect(kinds).toContain("expiring");
    expect(kinds).toContain("suspended");
    expect(kinds).toContain("pending-docs");
    expect(alerts.find((a) => a.kind === "suspended")?.text).toMatch(/Ben/);
  });

  it("flags rejected documents", () => {
    const alerts = fleetAlerts({
      drivers: [{ id: "d1", name: "Ana", status: "online" }],
      docs: [{ driverId: "d1", driverName: "Ana", docs: [doc({ status: "rejected" })] }],
      pendingDocs: 0,
      now: new Date("2026-09-28"),
    });
    expect(alerts.some((a) => a.kind === "rejected")).toBe(true);
  });

  it("is quiet for a healthy fleet", () => {
    expect(
      fleetAlerts({
        drivers: [{ id: "d1", name: "Ana", status: "online" }],
        docs: [{ driverId: "d1", driverName: "Ana", docs: [doc()] }],
        pendingDocs: 0,
        now: new Date("2026-09-28"),
      }),
    ).toEqual([]);
  });
});
