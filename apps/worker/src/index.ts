import admin from "firebase-admin";
import { existsSync, readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import {
  CLOSED_CONVERSATION_RETENTION_DAYS,
  MESSAGE_RETENTION_DAYS,
} from "@hailing/constants";
import {
  FcmPushProvider,
  LogEmailProvider,
  LogPushProvider,
  LogSmsProvider,
} from "@hailing/notifications";
import { backoffMs } from "./backoff.js";
import { resolveDatabaseUrl } from "./db-url.js";
import { OutboxConsumer } from "./outbox.js";

// Load a local apps/worker/.env for dev convenience (GOOGLE_APPLICATION_CREDENTIALS,
// etc.). Already-set process env wins, so prod (Coolify) injection is unaffected
// and a missing file is a silent no-op.
const loadEnvFile = (
  process as unknown as {
    loadEnvFile?: (path: string) => void;
  }
).loadEnvFile;
if (typeof loadEnvFile === "function" && existsSync(".env")) {
  try {
    loadEnvFile.call(process, ".env");
  } catch {
    // Malformed .env: ignore, fall back to process env.
  }
}

process.env.DATABASE_URL = resolveDatabaseUrl();

const POLL_MS = Number(process.env.WORKER_POLL_MS ?? 10_000);
const PURGE_MS = 60 * 60 * 1000;

const prisma = new PrismaClient();

/**
 * Real FCM when GOOGLE_APPLICATION_CREDENTIALS points at a service-account
 * JSON; otherwise the log provider (safe no-op in dev). Reads the file
 * explicitly so the project id is always set and misconfig degrades to log
 * rather than crashing the worker.
 */
function pushProvider(): {
  provider: FcmPushProvider | LogPushProvider;
  mode: string;
} {
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!path) return { provider: new LogPushProvider(), mode: "log (disabled)" };
  try {
    const sa = JSON.parse(readFileSync(path, "utf8")) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
    if (!sa.project_id || !sa.client_email || !sa.private_key) {
      throw new Error(
        "service account missing project_id/client_email/private_key",
      );
    }
    admin.initializeApp({
      projectId: sa.project_id,
      credential: admin.credential.cert({
        projectId: sa.project_id,
        clientEmail: sa.client_email,
        privateKey: sa.private_key.replace(/\\n/g, "\n"),
      }),
    });
    return { provider: new FcmPushProvider(), mode: `fcm (${sa.project_id})` };
  } catch (e) {
    const reason = e instanceof Error ? e.message : "unknown";
    console.error(`FCM init failed (${reason}); using log push provider`);
    return {
      provider: new LogPushProvider(),
      mode: `log (fcm init failed: ${reason})`,
    };
  }
}

const { provider: pushProviderInstance, mode: pushMode } = pushProvider();

const outbox = new OutboxConsumer(prisma, {
  SMS: new LogSmsProvider(),
  PUSH: pushProviderInstance,
  EMAIL: new LogEmailProvider(),
});

console.log(
  `hailing worker starting (outbox poll every ${POLL_MS}ms, push=${pushMode})`,
);

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
