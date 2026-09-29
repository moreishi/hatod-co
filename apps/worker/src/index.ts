import { backoffMs } from "./backoff.js";

const HEARTBEAT_MS = Number(process.env.WORKER_HEARTBEAT_MS ?? 30_000);

console.log(`hailing worker starting (heartbeat every ${HEARTBEAT_MS}ms)`);

const timer = setInterval(() => {
  console.log(`hailing worker alive; next retry ceiling ${backoffMs(5)}ms`);
}, HEARTBEAT_MS);

function shutdown(signal: string) {
  console.log(`hailing worker received ${signal}, shutting down`);
  clearInterval(timer);
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
