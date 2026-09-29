import { defineConfig } from "@playwright/test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const apiDir = join(root, "apps", "api");
const adminDir = join(root, "apps", "admin");
const agencyDir = join(root, "apps", "agency");

export const E2E = {
  apiPort: Number(process.env.E2E_API_PORT ?? 3101),
  adminPort: Number(process.env.E2E_ADMIN_PORT ?? 3100),
  agencyPort: Number(process.env.E2E_AGENCY_PORT ?? 3102),
  dbUrl:
    process.env.E2E_DATABASE_URL ?? `file:${join(apiDir, "prisma", "e2e.db")}`,
};

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  globalSetup: "./global-setup.ts",
  use: {
    baseURL: `http://localhost:${E2E.adminPort}`,
  },
  projects: [
    { name: "api", testMatch: /.*\.api\.spec\.ts/ },
    { name: "portals", testMatch: /.*\.portal\.spec\.ts/ },
  ],
  webServer: [
    {
      command: "pnpm start",
      cwd: apiDir,
      port: E2E.apiPort,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: String(E2E.apiPort),
        DATABASE_URL: E2E.dbUrl,
        JWT_SECRET: "e2e-secret",
      } as Record<string, string>,
    },
    {
      command: `pnpm exec next start --port ${E2E.adminPort}`,
      cwd: adminDir,
      port: E2E.adminPort,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        HAILING_API_URL: `http://localhost:${E2E.apiPort}`,
        JWT_SECRET: "e2e-secret",
      } as Record<string, string>,
    },
    {
      command: `pnpm exec next start --port ${E2E.agencyPort}`,
      cwd: agencyDir,
      port: E2E.agencyPort,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        HAILING_API_URL: `http://localhost:${E2E.apiPort}`,
        JWT_SECRET: "e2e-secret",
      } as Record<string, string>,
    },
  ],
});
