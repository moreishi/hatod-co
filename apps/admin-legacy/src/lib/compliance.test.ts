import { describe, expect, it } from "vitest";
import { canGoOnline } from "./compliance";
import type { Driver } from "./types";

function driver(over: Partial<Driver["docs"]> = {}): Driver {
  return {
    id: "drv-tdd",
    name: "TDD Driver",
    phone: "+639000000000",
    vehicleType: "moto",
    plateNo: "TDD-001",
    status: "approved",
    docs: {
      paExpiry: "2027-01-01",
      cpcExpiry: "2027-06-01",
      licenseNo: "L-TDD",
      ...over,
    },
    lat: 6.1164,
    lng: 125.1712,
    updatedAt: new Date().toISOString(),
  };
}

describe("canGoOnline (LTFRB compliance gate)", () => {
  it("allows a fully compliant driver", () => {
    expect(canGoOnline(driver(), new Date("2026-09-28"))).toEqual({ ok: true });
  });

  it("blocks expired PA", () => {
    const res = canGoOnline(driver({ paExpiry: "2026-09-01" }), new Date("2026-09-28"));
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/PA/i);
  });

  it("blocks expired CPC", () => {
    const res = canGoOnline(driver({ cpcExpiry: "2026-09-01" }), new Date("2026-09-28"));
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/CPC/i);
  });

  it("still allows docs expiring soon (warn, don't block)", () => {
    // PA expires in 7 days — dashboard flags it, gate stays open
    expect(canGoOnline(driver({ paExpiry: "2026-10-05" }), new Date("2026-09-28")).ok).toBe(
      true,
    );
  });
});
