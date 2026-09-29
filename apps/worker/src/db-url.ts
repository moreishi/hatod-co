import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * LocalStage database URL. Production sets DATABASE_URL explicitly;
 * development resolves apps/api/prisma/dev.db from the workspace root
 * (found by walking up to pnpm-workspace.yaml), because Prisma does not
 * resolve relative file: URLs against the worker's directory.
 */
export function resolveDatabaseUrl(fromDir?: string): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  let dir = resolve(fromDir ?? dirname(fileURLToPath(import.meta.url)));
  while (true) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) {
      const dbPath = join(dir, "apps", "api", "prisma", "dev.db").replace(
        /\\/g,
        "/",
      );
      return `file:${dbPath}`;
    }
    const parent = dirname(dir);
    if (parent === dir)
      throw new Error("workspace root not found (no pnpm-workspace.yaml)");
    dir = parent;
  }
}
