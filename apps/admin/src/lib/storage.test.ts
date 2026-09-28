import { describe, expect, it } from "vitest";
import { buildDocKey, checkUpload } from "./storage";

describe("buildDocKey (traversal-safe)", () => {
  it("namespaces by driver and type; extension from validated MIME, not filename", () => {
    const key = buildDocKey("drv-1", "license", "my license!!.PDF", "application/pdf");
    expect(key).toMatch(/^drivers\/drv-1\/license\//);
    expect(key).not.toMatch(/[! ]/);
    expect(key.endsWith(".pdf")).toBe(true);
    // lying filename gets the true type's extension
    expect(buildDocKey("drv-1", "nbi", "evil.exe", "image/png").endsWith(".png")).toBe(true);
  });

  it("rejects path tricks and unknown types", () => {
    expect(() => buildDocKey("../x", "license", "a.png", "image/png")).toThrow(/driver/i);
    expect(() => buildDocKey("drv-1", "license", "a.bin", "application/x-msdownload")).toThrow(
      /content type/i,
    );
  });
});

describe("checkUpload (type + size gate)", () => {
  it("accepts jpg/png/pdf within limit", () => {
    expect(checkUpload("image/jpeg", 1024).ok).toBe(true);
    expect(checkUpload("application/pdf", 4 * 1024 * 1024).ok).toBe(true);
  });

  it("rejects executables and oversize files", () => {
    expect(checkUpload("application/x-msdownload", 100).ok).toBe(false);
    expect(checkUpload("image/png", 6 * 1024 * 1024).ok).toBe(false);
  });
});
