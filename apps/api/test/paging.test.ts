import { describe, expect, it } from "vitest";
import { DEFAULT_TAKE, MAX_TAKE, parsePage } from "../src/common/paging.js";

describe("parsePage", () => {
  it("defaults take/skip", () => {
    expect(parsePage({})).toEqual({ take: DEFAULT_TAKE, skip: 0 });
  });

  it("parses explicit values", () => {
    expect(parsePage({ take: "10", skip: "20" })).toEqual({
      take: 10,
      skip: 20,
    });
  });

  it("clamps take to [1, MAX] and floors skip at 0", () => {
    expect(parsePage({ take: "9999", skip: "-5" })).toEqual({
      take: MAX_TAKE,
      skip: 0,
    });
    expect(parsePage({ take: "abc" })).toEqual({ take: DEFAULT_TAKE, skip: 0 });
  });
});
