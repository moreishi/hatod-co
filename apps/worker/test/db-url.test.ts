import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { resolveDatabaseUrl } from "../src/db-url.js";

describe("resolveDatabaseUrl", () => {
  it("prefers an explicit DATABASE_URL", () => {
    process.env.DATABASE_URL = "postgresql://prod/db";
    expect(resolveDatabaseUrl("/tmp")).toBe("postgresql://prod/db");
    delete process.env.DATABASE_URL;
  });

  it("walks up to the workspace root for LocalStage", () => {
    const url = resolveDatabaseUrl(dirname(fileURLToPath(import.meta.url)));
    expect(url.startsWith("file:")).toBe(true);
    expect(url.endsWith("apps/api/prisma/dev.db")).toBe(true);
  });
});
