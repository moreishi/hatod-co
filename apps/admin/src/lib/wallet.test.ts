import { describe, expect, it } from "vitest";
import {
  TX_TYPES,
  applyDelta,
  settleRide,
  toCentavos,
  validateAdjustment,
  validateMemo,
  validateTopup,
} from "./wallet";

describe("toCentavos", () => {
  it("converts pesos without float drift", () => {
    expect(toCentavos(124)).toBe(12400);
    expect(toCentavos(0)).toBe(0);
  });
});

describe("settleRide (completed trip splits)", () => {
  it("debits rider, credits driver net of 15% commission", () => {
    const s = settleRide(12400);
    expect(s).toEqual({ rider: -12400, driver: 10540, commission: 1860 });
  });
});

describe("applyDelta (balance guard)", () => {
  it("applies credits and affordable debits", () => {
    expect(applyDelta(10000, 5000)).toBe(15000);
    expect(applyDelta(10000, -4000)).toBe(6000);
  });

  it("blocks overdrafts", () => {
    expect(() => applyDelta(1000, -2000)).toThrow(/insufficient/i);
  });
});

describe("validateAdjustment (superadmin credit/debit)", () => {
  it("signs credit positive, debit negative", () => {
    expect(validateAdjustment({ direction: "credit", pesos: 500 })).toBe(50000);
    expect(validateAdjustment({ direction: "debit", pesos: 500 })).toBe(-50000);
  });

  it("rejects zero and absurd amounts", () => {
    expect(() => validateAdjustment({ direction: "credit", pesos: 0 })).toThrow(/positive/i);
    expect(() => validateAdjustment({ direction: "debit", pesos: 10_000_001 })).toThrow(/limit/i);
  });
});

describe("validateTopup (cash-in)", () => {
  it("accepts positive peso amounts", () => {
    expect(validateTopup(500)).toBe(50000);
  });

  it("rejects zero, negative, and absurd amounts", () => {
    expect(() => validateTopup(0)).toThrow(/positive/i);
    expect(() => validateTopup(-50)).toThrow(/positive/i);
    expect(() => validateTopup(10_000_001)).toThrow(/limit/i);
  });
});

describe("validateMemo + TX_TYPES", () => {
  it("trims memo and caps length", () => {
    expect(validateMemo("  Friday payout  ")).toBe("Friday payout");
    expect(validateMemo("")).toBeNull();
    expect(() => validateMemo("x".repeat(141))).toThrow(/140/i);
  });

  it("lists the filterable transaction types", () => {
    expect(TX_TYPES).toEqual(
      expect.arrayContaining(["topup", "ride_debit", "ride_credit", "payout", "adjustment"]),
    );
  });
});
