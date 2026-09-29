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
  execFileSync("pnpm exec prisma migrate deploy", opts);
  execFileSync(`pnpm exec tsx ${join(here, "seed.ts")}`, opts);
}
