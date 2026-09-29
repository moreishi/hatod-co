import { execSync } from "node:child_process";
import { E2E } from "./playwright.config.js";

/**
 * Clear stale servers from e2e ports BEFORE Playwright launches webServers.
 * A squatter satisfies the port check while serving old code — the source
 * of silent stale-build test runs. (Runs before servers exist, never after.)
 */
if (process.platform === "win32") {
  for (const port of [
    E2E.apiPort,
    E2E.adminPort,
    E2E.agencyPort,
    E2E.riderPort,
    E2E.driverPort,
  ]) {
    try {
      const out = execSync(
        `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess"`,
      )
        .toString()
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      for (const pid of out) {
        try {
          process.kill(Number(pid));
          console.log(`killed stale pid ${pid} on :${port}`);
        } catch {
          // already gone
        }
      }
    } catch {
      // no listener
    }
  }
}
