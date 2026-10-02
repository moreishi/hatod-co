import { describe, expect, it } from "vitest";
import {
  isInlineImage,
  reviewActionLabel,
  reviewActionsFor,
} from "./review.js";

describe("isInlineImage", () => {
  it("detects inline photo payloads, not references", () => {
    expect(isInlineImage("data:image/jpeg;base64,/9j/")).toBe(true);
    expect(isInlineImage("data:image/png;base64,iVBOR")).toBe(true);
    expect(isInlineImage("docs/d-1/license.pdf")).toBe(false);
    expect(isInlineImage("")).toBe(false);
  });
});

describe("reviewActionsFor", () => {
  it("offers start-review while pending, verdicts while under review", () => {
    expect(reviewActionsFor("DOCUMENTS_PENDING")).toEqual(["start-review"]);
    expect(reviewActionsFor("DOCUMENTS_UNDER_REVIEW")).toEqual([
      "approve",
      "reject",
    ]);
  });

  it("offers nothing outside the review window", () => {
    for (const s of ["APPLICANT", "REJECTED", "NOPE"]) {
      expect(reviewActionsFor(s)).toEqual([]);
    }
  });

  it("suspends active drivers and reactivates suspended ones", () => {
    expect(reviewActionsFor("ACTIVE")).toEqual(["suspend"]);
    expect(reviewActionsFor("SUSPENDED")).toEqual(["reactivate"]);
  });

  it("labels every action in plain language", () => {
    expect(reviewActionLabel("start-review")).toBe("Start review");
    expect(reviewActionLabel("approve")).toBe("Approve");
    expect(reviewActionLabel("reject")).toBe("Reject");
    expect(reviewActionLabel("suspend")).toBe("Suspend driver");
    expect(reviewActionLabel("reactivate")).toBe("Reactivate");
  });
});
