import { describe, expect, it } from "vitest";
import { seedAllowed } from "../prisma/seed-guard.js";

describe("seedAllowed", () => {
  it("allows local sqlite file urls", () => {
    expect(seedAllowed("file:./dev.db")).toBe(true);
  });

  it("allows localhost databases", () => {
    expect(seedAllowed("postgres://u:p@localhost:5432/hailing")).toBe(true);
  });

  it("refuses remote or unset urls by default", () => {
    expect(seedAllowed("postgres://u:p@db.internal:5432/hailing")).toBe(false);
    expect(seedAllowed("")).toBe(false);
  });

  it("allows remote urls only with an explicit ALLOW_SEED opt-in", () => {
    expect(
      seedAllowed("postgres://u:p@db.internal:5432/hailing", {
        allowSeed: true,
      }),
    ).toBe(true);
  });

  it("treats anything but exactly true as no opt-in", () => {
    expect(
      seedAllowed("postgres://u:p@db.internal:5432/hailing", {
        allowSeed: false,
      }),
    ).toBe(false);
  });
});
