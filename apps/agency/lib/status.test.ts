import { describe, expect, it } from "vitest";
import { humanDocType, humanStatus, humanTransition } from "./status.js";

describe("humanStatus", () => {
  it("names every ride and driver state in plain language", () => {
    expect(humanStatus("REQUESTED")).toBe("Requested");
    expect(humanStatus("NO_DRIVERS")).toBe("Needs a driver");
    expect(humanStatus("ASSIGNED")).toBe("Assigned");
    expect(humanStatus("DRIVER_EN_ROUTE")).toBe("Driver heading out");
    expect(humanStatus("DRIVER_ARRIVED")).toBe("Driver arrived");
    expect(humanStatus("IN_PROGRESS")).toBe("On trip");
    expect(humanStatus("COMPLETED")).toBe("Completed");
    expect(humanStatus("CANCELLED")).toBe("Cancelled");
    expect(humanStatus("APPLICANT")).toBe("Applicant");
    expect(humanStatus("DOCUMENTS_PENDING")).toBe("Documents pending");
    expect(humanStatus("DOCUMENTS_UNDER_REVIEW")).toBe("Under review");
    expect(humanStatus("ACTIVE")).toBe("Active");
    expect(humanStatus("REJECTED")).toBe("Rejected");
    expect(humanStatus("SUSPENDED")).toBe("Suspended");
  });

  it("falls back to the raw code for unknown states", () => {
    expect(humanStatus("SOMETHING_NEW")).toBe("SOMETHING_NEW");
  });
});

describe("humanTransition", () => {
  it("names dispatcher actions as verbs", () => {
    expect(humanTransition("DRIVER_EN_ROUTE")).toBe("Mark heading out");
    expect(humanTransition("DRIVER_ARRIVED")).toBe("Mark arrived");
    expect(humanTransition("IN_PROGRESS")).toBe("Start trip");
    expect(humanTransition("COMPLETED")).toBe("Complete trip");
    expect(humanTransition("CANCELLED")).toBe("Cancel ride");
  });
});

describe("humanDocType", () => {
  it("names known documents, passes the rest through", () => {
    expect(humanDocType("DRIVERS_LICENSE")).toBe("Driver's license");
    expect(humanDocType("OR_CR")).toBe("Vehicle OR/CR");
    expect(humanDocType("NBI_CLEARANCE")).toBe("NBI clearance");
    expect(humanDocType("INSURANCE")).toBe("Insurance policy");
    expect(humanDocType("PROOF_OF_ADDRESS")).toBe("Proof of address");
    expect(humanDocType("WEIRD_NEW_DOC")).toBe("WEIRD_NEW_DOC");
  });
});
