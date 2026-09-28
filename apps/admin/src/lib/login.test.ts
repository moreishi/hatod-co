import { describe, expect, it } from "vitest";
import { resolveLoginIdentity } from "./phone";

describe("resolveLoginIdentity (email or PH phone)", () => {
  it("routes emails to email lookup", () => {
    expect(resolveLoginIdentity("Ops@hatod.co")).toEqual({
      kind: "email",
      value: "ops@hatod.co",
    });
  });

  it("routes PH numbers to phone lookup, any format", () => {
    expect(resolveLoginIdentity("09171110011")).toEqual({
      kind: "phone",
      value: "+639171110011",
    });
    expect(resolveLoginIdentity("+639171110011")).toEqual({
      kind: "phone",
      value: "+639171110011",
    });
  });

  it("rejects garbage", () => {
    expect(() => resolveLoginIdentity("nope")).toThrow(/login/i);
    expect(() => resolveLoginIdentity("")).toThrow(/login/i);
  });
});
