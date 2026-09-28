import { describe, expect, it } from "vitest";
import { matchUserByPhone, normalizePhPhone } from "./phone";

describe("normalizePhPhone", () => {
  it("normalizes local, country-code and spaced formats to +63", () => {
    expect(normalizePhPhone("09171110011")).toBe("+639171110011");
    expect(normalizePhPhone("+639171110011")).toBe("+639171110011");
    expect(normalizePhPhone("639171110011")).toBe("+639171110011");
    expect(normalizePhPhone("0917 111 0011")).toBe("+639171110011");
    expect(normalizePhPhone("0917-111-0011")).toBe("+639171110011");
  });

  it("rejects non-PH and malformed numbers", () => {
    expect(() => normalizePhPhone("")).toThrow(/phone/i);
    expect(() => normalizePhPhone("+14155552671")).toThrow(/phone/i);
    expect(() => normalizePhPhone("123")).toThrow(/phone/i);
  });
});

describe("matchUserByPhone", () => {
  const users = [
    { id: "usr-1", phone: "+639171110011" },
    { id: "usr-2", phone: "+639171110022" },
  ];

  it("matches across formats", () => {
    expect(matchUserByPhone("09171110011", users)?.id).toBe("usr-1");
  });

  it("returns null when nothing matches or input is bad", () => {
    expect(matchUserByPhone("09170000000", users)).toBeNull();
    expect(matchUserByPhone("", users)).toBeNull();
  });
});
