import { describe, expect, it } from "vitest";
import {
  DEFAULT_AGENCY_ID,
  agencyDisplayName,
  canManageDriver,
  canOffboard,
  filterDrivers,
  validateDriver,
} from "./driverRules";
import { createDriver } from "./drivers";
import type { Driver } from "./types";

function driver(over: Partial<Driver> = {}): Driver {
  return {
    id: "drv-1",
    name: "D. Santos",
    phone: "+639171110001",
    vehicleType: "moto",
    plateNo: "MC-1001",
    status: "pending",
    docs: { paExpiry: "2027-01-01", cpcExpiry: "2027-06-01", licenseNo: "L-1" },
    lat: 6.1164,
    lng: 125.1712,
    updatedAt: new Date().toISOString(),
    agencyUserId: "usr-agency-1",
    ...over,
  };
}

describe("validateDriver (agency onboarding)", () => {
  it("accepts a complete driver record", () => {
    const d = validateDriver({
      name: " D. Santos ",
      phone: "09171110001",
      vehicleType: "moto",
      plateNo: "MC-1001",
      paExpiry: "2027-01-01",
      cpcExpiry: "2027-06-01",
      licenseNo: "L-1",
    });
    expect(d.phone).toBe("+639171110001");
    expect(d.vehicleType).toBe("moto");
  });

  it("rejects bad phone, vehicle, plate, doc dates", () => {
    const base = {
      name: "D",
      phone: "09171110001",
      vehicleType: "moto",
      plateNo: "MC-1",
      paExpiry: "2027-01-01",
      cpcExpiry: "2027-06-01",
      licenseNo: "L",
    };
    expect(() => validateDriver({ ...base, phone: "123" })).toThrow(/phone/i);
    expect(() => validateDriver({ ...base, vehicleType: "jeep" })).toThrow(/vehicle/i);
    expect(() => validateDriver({ ...base, plateNo: " " })).toThrow(/plate/i);
    expect(() => validateDriver({ ...base, paExpiry: "not-a-date" })).toThrow(/pa/i);
  });
});

describe("canOffboard (history is sacred)", () => {
  it("allows removal only with zero trips", () => {
    expect(canOffboard(0).ok).toBe(true);
    const blocked = canOffboard(3);
    expect(blocked.ok).toBe(false);
    expect(blocked.reason).toMatch(/trip history/i);
  });
});

describe("default agency (every driver has an owner)", () => {
  it("pins a stable system id", () => {
    expect(DEFAULT_AGENCY_ID).toBe("usr-agency-default");
  });

  it("prefers the business name, falls back to the account name", () => {
    expect(agencyDisplayName("Aya Agency", "Gensan Fleet Co")).toBe("Gensan Fleet Co");
    expect(agencyDisplayName("Aya Agency", null)).toBe("Aya Agency");
  });

  it("rejects agency-less onboarding", async () => {
    await expect(
      createDriver(
        {
          name: "No Owner",
          phone: "09170001111",
          vehicleType: "moto",
          plateNo: "X-1",
          paExpiry: "2027-01-01",
          cpcExpiry: "2027-06-01",
          licenseNo: "L",
        },
        null,
      ),
    ).rejects.toThrow(/agency/i);
  });
});

describe("filterDrivers (table search)", () => {
  const list = [
    driver({ id: "d1", name: "Ana Santos", phone: "+639170000001", plateNo: "MC-1", status: "online" }),
    driver({ id: "d2", name: "Ben Cruz", phone: "+639170000002", plateNo: "TR-2", status: "pending" }),
  ];
  it("matches name, phone, plate, status case-insensitively", () => {
    expect(filterDrivers(list, "ana").map((d) => d.id)).toEqual(["d1"]);
    expect(filterDrivers(list, "TR-2").map((d) => d.id)).toEqual(["d2"]);
    expect(filterDrivers(list, "pending").map((d) => d.id)).toEqual(["d2"]);
    expect(filterDrivers(list, "  ").map((d) => d.id)).toEqual(["d1", "d2"]);
  });
});

describe("canManageDriver (fleet scope)", () => {
  it("lets an agency manage its own drivers only", () => {
    expect(canManageDriver(["agency"], "usr-agency-1", driver())).toBe(true);
    expect(canManageDriver(["agency"], "usr-other", driver())).toBe(false);
    expect(canManageDriver(["agency"], "usr-agency-1", driver({ agencyUserId: null }))).toBe(
      false,
    );
  });

  it("lets staff manage any driver", () => {
    expect(canManageDriver(["operations"], "usr-ops", driver())).toBe(true);
    expect(canManageDriver(["superadmin"], "usr-admin", driver({ agencyUserId: null }))).toBe(
      true,
    );
  });

  it("denies app identities", () => {
    expect(canManageDriver(["driver"], "usr-agency-1", driver())).toBe(false);
    expect(canManageDriver(["rider"], "usr-agency-1", driver())).toBe(false);
  });
});
