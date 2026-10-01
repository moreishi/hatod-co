import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FullConfig } from "@playwright/test";
import { E2E } from "./playwright.config.js";

/** Fresh isolated database + compact world before the suite. */
export default function setup(_config: FullConfig) {
  const here = dirname(fileURLToPath(import.meta.url));
  const apiDir = join(here, "..", "api");
  const env = { ...process.env, DATABASE_URL: E2E.dbUrl };
  const opts = {
    cwd: apiDir,
    env: env as Record<string, string>,
    stdio: "inherit",
    shell: true,
  } as const;
  // Postgres is the e2e default (hailing_e2e); a file: E2E_DATABASE_URL
  // still takes the legacy sqlite path.
  const schema =
    E2E.dbUrl.startsWith("postgresql://") || E2E.dbUrl.startsWith("postgres://")
      ? " --schema prisma/postgres/schema.prisma"
      : "";
  execFileSync(`pnpm exec prisma migrate deploy${schema}`, opts);
  execFileSync(`pnpm exec tsx ${join(here, "seed.ts")}`, opts);
}
