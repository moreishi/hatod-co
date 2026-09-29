import { describe, expect, it } from "vitest";
import { configFromEnv, scaledMs } from "../src/config.js";
import { mulberry32, pick } from "../src/random.js";
import { SCENARIOS } from "../src/scenarios.js";

describe("simulator determinism (plan §14)", () => {
  it("reproduces PRNG streams per seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seq = (r: () => number) => [r(), r(), r()];
    expect(seq(a)).toEqual(seq(b));
  });

  it("picks deterministically", () => {
    const r = mulberry32(7);
    expect(pick(r, ["a", "b", "c"])).toBe(pick(mulberry32(7), ["a", "b", "c"]));
  });

  it("scales waits by speed", () => {
    expect(scaledMs(60, 1)).toBe(60_000);
    expect(scaledMs(60, 10)).toBe(6_000);
    expect(scaledMs(60, 0)).toBe(60_000);
  });
});

describe("simulator config (plan §21)", () => {
  it("reads env with LocalStage defaults", () => {
    const config = configFromEnv();
    expect(config.apiUrl).toBe("http://localhost:3001");
    expect(config.scenario).toBe("normal_ride");
    expect(config.seed).toBe(42);
  });

  it("registers the Phase 1 scenarios", () => {
    expect(Object.keys(SCENARIOS).sort()).toEqual([
      "cancel_before_accept",
      "chat_reconnect",
      "driver_reject",
      "message_retry",
      "normal_ride",
    ]);
  });
});
