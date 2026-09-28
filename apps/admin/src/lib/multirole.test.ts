import { describe, expect, it } from "vitest";
import { hasRole } from "./access";
import { parseRoles } from "./users";

describe("multi-profile users", () => {
  it("one user can be rider and driver at once", () => {
    expect(parseRoles(["rider", "driver"])).toEqual(["rider", "driver"]);
    expect(hasRole(["rider", "driver"], "driver")).toBe(true);
    expect(hasRole(["rider", "driver"], "rider")).toBe(true);
    expect(hasRole(["rider", "driver"], "agency")).toBe(false);
  });

  it("superadmin wildcard still holds with a role set", () => {
    expect(hasRole(["superadmin"], "driver")).toBe(true);
  });

  it("rejects empty sets and unknown roles", () => {
    expect(() => parseRoles([])).toThrow(/role/i);
    expect(() => parseRoles(["root"])).toThrow(/role/i);
    expect(() => parseRoles("driver")).toThrow(/role/i);
  });
});
