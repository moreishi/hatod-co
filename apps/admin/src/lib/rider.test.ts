import { describe, expect, it } from "vitest";
import { canBook } from "./rider";
import type { Rider } from "./types";

function rider(over: Partial<Rider> = {}): Rider {
  return {
    id: "rdr-tdd",
    name: "TDD Rider",
    phone: "+639171110099",
    status: "active",
    createdAt: new Date().toISOString(),
    ...over,
  };
}

describe("canBook (rider gate)", () => {
  it("allows an active rider with a phone", () => {
    expect(canBook(rider())).toEqual({ ok: true });
  });

  it("blocks suspended riders", () => {
    const res = canBook(rider({ status: "suspended" }));
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/suspend/i);
  });

  it("blocks riders with no phone", () => {
    const res = canBook(rider({ phone: "" }));
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/phone/i);
  });
});
