import { describe, expect, it } from "vitest";
import { latestVerified, summarizePending, validateDocument } from "./documents";

describe("validateDocument", () => {
  it("accepts known types with expiry where required", () => {
    expect(
      validateDocument({ type: "license", expiryDate: "2027-01-01" }).type,
    ).toBe("license");
    expect(validateDocument({ type: "vehicle_photo" }).type).toBe("vehicle_photo");
  });

  it("rejects unknown types and missing expiries", () => {
    expect(() => validateDocument({ type: "passport" })).toThrow(/type/i);
    expect(() => validateDocument({ type: "license" })).toThrow(/expiry/i);
    expect(() => validateDocument({ type: "license", expiryDate: "yesterday" })).toThrow(
      /expiry/i,
    );
  });
});

describe("summarizePending (fleet inbox)", () => {
  const docs = [
    { driverId: "d1", driverName: "Ana", type: "license", status: "pending" },
    { driverId: "d1", driverName: "Ana", type: "nbi", status: "pending" },
    { driverId: "d2", driverName: "Ben", type: "license", status: "verified" },
    { driverId: "d2", driverName: "Ben", type: "or_cr", status: "pending" },
  ];
  it("groups pending docs by driver, newest concern first", () => {
    const rows = summarizePending(docs as never);
    expect(rows).toEqual([
      { driverId: "d1", driverName: "Ana", count: 2 },
      { driverId: "d2", driverName: "Ben", count: 1 },
    ]);
  });
  it("is empty when nothing pending", () => {
    expect(summarizePending([])).toEqual([]);
  });
});

describe("latestVerified (renewal wins)", () => {
  const docs = [
    { id: "a", type: "license", status: "verified", uploadedAt: "2025-01-01" },
    { id: "b", type: "license", status: "verified", uploadedAt: "2026-01-01" },
    { id: "c", type: "license", status: "pending", uploadedAt: "2026-06-01" },
  ];
  it("picks the newest verified row, ignoring pending", () => {
    expect(latestVerified(docs as never, "license")?.id).toBe("b");
  });
  it("returns null when nothing verified", () => {
    expect(latestVerified([], "license")).toBeNull();
  });
});
