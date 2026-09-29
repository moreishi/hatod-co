import { createContext, SCENARIOS } from "./scenarios.js";

/**
 * Simulator CLI (simulator plan Phase 1).
 * Usage: pnpm --filter @hailing/simulator exec tsx src/index.ts [scenario] [--seed N]
 * Target: SIM_API_URL (default http://localhost:3001). Requires dev codes,
 * so it runs against LocalStage, never production.
 */
async function main() {
  const argScenario =
    process.argv[2] ?? process.env.SIM_SCENARIO ?? "normal_ride";
  const seedArg = process.argv.indexOf("--seed");
  const seed = seedArg >= 0 ? Number(process.argv[seedArg + 1]) : undefined;
  const scenario = SCENARIOS[argScenario];
  if (!scenario) {
    console.error(
      `unknown scenario ${argScenario}; choices: ${Object.keys(SCENARIOS).join(", ")}`,
    );
    process.exit(1);
  }
  const ctx = createContext(seed === undefined ? {} : { seed });
  const started = Date.now();
  try {
    const result = await scenario(ctx);
    console.log(JSON.stringify({ ...result, ms: Date.now() - started }));
    for (const e of ctx.events) {
      console.log(
        `${e.at} [${e.agent}] ${e.event}${e.detail ? ` ${e.detail}` : ""}`,
      );
    }
  } catch (e) {
    console.error(`scenario failed: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
  process.exit(0);
}

void main();
