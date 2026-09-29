import { PrismaClient } from "@prisma/client";
import { backoffMs } from "./backoff.js";
import { resolveDatabaseUrl } from "./db-url.js";
import { OutboxConsumer } from "./outbox.js";

process.env.DATABASE_URL = resolveDatabaseUrl();

const POLL_MS = Number(process.env.WORKER_POLL_MS ?? 10_000);

const prisma = new PrismaClient();
const outbox = new OutboxConsumer(prisma);

console.log(`hailing worker starting (outbox poll every ${POLL_MS}ms)`);

let stopped = false;
let attempt = 0;

async function tick() {
  if (stopped) return;
  try {
    const result = await outbox.drain();
    attempt = 0;
    if (result.sent + result.failed + result.deferred > 0) {
      console.log(`outbox drain: ${JSON.stringify(result)}`);
    }
  } catch (e) {
    attempt += 1;
    console.error(`outbox drain failed (attempt ${attempt}):`, e);
    await new Promise((resolve) => setTimeout(resolve, backoffMs(attempt)));
  }
  if (!stopped) setTimeout(tick, POLL_MS);
}

void tick();

async function shutdown(signal: string) {
  console.log(`hailing worker received ${signal}, shutting down`);
  stopped = true;
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
