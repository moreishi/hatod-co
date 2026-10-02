import { describe, expect, it } from "vitest";
import { humanStatus, humanTxnType } from "./status.js";

describe("humanStatus", () => {
  it("names ride states in plain language", () => {
    expect(humanStatus("REQUESTED")).toBe("Requested");
    expect(humanStatus("NO_DRIVERS")).toBe("Needs a driver");
    expect(humanStatus("ASSIGNED")).toBe("Assigned");
    expect(humanStatus("DRIVER_EN_ROUTE")).toBe("Driver heading out");
    expect(humanStatus("DRIVER_ARRIVED")).toBe("Driver arrived");
    expect(humanStatus("IN_PROGRESS")).toBe("On trip");
    expect(humanStatus("COMPLETED")).toBe("Completed");
    expect(humanStatus("CANCELLED")).toBe("Cancelled");
  });

  it("falls back to the raw code", () => {
    expect(humanStatus("SOMETHING_NEW")).toBe("SOMETHING_NEW");
  });
});

describe("humanTxnType", () => {
  it("names ledger entry types", () => {
    expect(humanTxnType("RIDE_EARNING")).toBe("Ride earning");
    expect(humanTxnType("TOP_UP")).toBe("Top-up");
    expect(humanTxnType("ADJUSTMENT")).toBe("Adjustment");
    expect(humanTxnType("COMMISSION")).toBe("Commission");
    expect(humanTxnType("PAYOUT")).toBe("Payout");
    expect(humanTxnType("SOMETHING_NEW")).toBe("SOMETHING_NEW");
  });
});
