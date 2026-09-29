import { PrismaClient } from "@prisma/client";
import {
  CLOSED_CONVERSATION_RETENTION_DAYS,
  MESSAGE_RETENTION_DAYS,
} from "@hailing/constants";
import { backoffMs } from "./backoff.js";
import { resolveDatabaseUrl } from "./db-url.js";
import { OutboxConsumer } from "./outbox.js";

process.env.DATABASE_URL = resolveDatabaseUrl();

const POLL_MS = Number(process.env.WORKER_POLL_MS ?? 10_000);
const PURGE_MS = 60 * 60 * 1000;

const prisma = new PrismaClient();
const outbox = new OutboxConsumer(prisma);

console.log(`hailing worker starting (outbox poll every ${POLL_MS}ms)`);

let stopped = false;
let attempt = 0;
let lastPurge = 0;

/** Retention cleanup (messaging spec §30): old messages, then old closed conversations. */
export async function purgeMessaging(
  client: Pick<PrismaClient, "message" | "conversation">,
  now = Date.now(),
) {
  const messageCutoff = new Date(
    now - MESSAGE_RETENTION_DAYS * 24 * 3600 * 1000,
  );
  const closedCutoff = new Date(
    now - CLOSED_CONVERSATION_RETENTION_DAYS * 24 * 3600 * 1000,
  );
  const messages = await client.message.deleteMany({
    where: { createdAt: { lt: messageCutoff } },
  });
  const conversations = await client.conversation.deleteMany({
    where: { status: "CLOSED", closedAt: { lt: closedCutoff } },
  });
  return { messages: messages.count, conversations: conversations.count };
}

async function tick() {
  if (stopped) return;
  try {
    const result = await outbox.drain();
    attempt = 0;
    if (result.sent + result.failed + result.deferred > 0) {
      console.log(`outbox drain: ${JSON.stringify(result)}`);
    }
    if (Date.now() - lastPurge > PURGE_MS) {
      lastPurge = Date.now();
      const purged = await purgeMessaging(prisma).catch((e) => ({
        error: String(e),
      }));
      console.log(`retention purge: ${JSON.stringify(purged)}`);
    }
  } catch (e) {
    attempt += 1;
    console.error(`outbox drain failed (attempt ${attempt}):`, e);
    await new Promise((resolve) => setTimeout(resolve, backoffMs(attempt)));
  }
  if (!stopped) setTimeout(tick, POLL_MS);
}

if (!process.env.VITEST) {
  void tick();
}

async function shutdown(signal: string) {
  console.log(`hailing worker received ${signal}, shutting down`);
  stopped = true;
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
