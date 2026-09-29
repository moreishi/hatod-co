import { describe, expect, it } from "vitest";
import { canAccessAgency } from "./agency-guard.js";

describe("canAccessAgency", () => {
  it("allows members of the agency and platform admins", () => {
    expect(canAccessAgency(["RIDER", "AGENCY:ag-1:OWNER"], "ag-1")).toBe(true);
    expect(canAccessAgency(["RIDER", "AGENCY:ag-1:VIEWER"], "ag-1")).toBe(true);
    expect(canAccessAgency(["ADMIN:SUPER_ADMIN", "RIDER"], "ag-1")).toBe(true);
  });

  it("denies other agencies, riders, and prefix lookalikes", () => {
    expect(canAccessAgency(["RIDER", "AGENCY:ag-1:OWNER"], "ag-2")).toBe(false);
    expect(canAccessAgency(["RIDER"], "ag-1")).toBe(false);
    expect(canAccessAgency([], "ag-1")).toBe(false);
    // ag-10 must not match ag-1's prefix without the colon boundary
    expect(canAccessAgency(["AGENCY:ag-1:OWNER"], "ag-10")).toBe(false);
  });
});
