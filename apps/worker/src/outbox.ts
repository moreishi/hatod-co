import type { PrismaClient } from "@prisma/client";
import {
  LogEmailProvider,
  LogPushProvider,
  LogSmsProvider,
  type NotificationProvider,
} from "@hailing/notifications";
import { backoffMs } from "./backoff.js";

export const MAX_ATTEMPTS = 5;

export interface OutboxRow {
  id: string;
  channel: string;
  template: string;
  payload: string;
  attempts: number;
}

interface OutboxReader {
  notification: {
    findMany(args: unknown): Promise<OutboxRow[]>;
    update(args: unknown): Promise<unknown>;
  };
}

/**
 * Poll-based outbox consumer (spec §47). RabbitMQ replaces the poll loop in
 * production; the delivery + retry semantics stay identical.
 */
export class OutboxConsumer {
  private readonly providers: Record<string, NotificationProvider>;

  constructor(
    private readonly prisma: OutboxReader,
    providers?: Record<string, NotificationProvider>,
  ) {
    this.providers = providers ?? {
      SMS: new LogSmsProvider(),
      PUSH: new LogPushProvider(),
      EMAIL: new LogEmailProvider(),
    };
  }

  /** Deliver one batch of QUEUED rows. Returns counts per outcome. */
  async drain(
    batchSize = 20,
  ): Promise<{ sent: number; failed: number; deferred: number }> {
    const rows = await this.prisma.notification.findMany({
      where: { status: "QUEUED" },
      orderBy: { createdAt: "asc" },
      take: batchSize,
    });
    let sent = 0;
    let failed = 0;
    let deferred = 0;
    for (const row of rows) {
      const outcome = await this.deliver(row);
      if (outcome === "sent") sent += 1;
      else if (outcome === "failed") failed += 1;
      else deferred += 1;
    }
    return { sent, failed, deferred };
  }

  private async deliver(
    row: OutboxRow,
  ): Promise<"sent" | "failed" | "deferred"> {
    const provider = this.providers[row.channel];
    if (!provider) {
      await this.mark(
        row.id,
        "FAILED",
        row.attempts + 1,
        `no provider for ${row.channel}`,
      );
      return "failed";
    }
    const parsed = JSON.parse(row.payload) as {
      to?: string;
      variables?: Record<string, string | number>;
    };
    if (!parsed.to) {
      await this.mark(
        row.id,
        "FAILED",
        row.attempts + 1,
        "missing destination",
      );
      return "failed";
    }
    try {
      const receipt = await provider.send({
        channel: row.channel as "SMS",
        to: parsed.to,
        template: row.template,
        variables: parsed.variables ?? {},
      });
      await this.prisma.notification.update({
        where: { id: row.id },
        data: {
          status: "SENT",
          attempts: row.attempts + 1,
          sentAt: receipt.deliveredAt,
        },
      });
      return "sent";
    } catch (e) {
      const attempts = row.attempts + 1;
      const message = e instanceof Error ? e.message : "delivery failed";
      if (attempts >= MAX_ATTEMPTS) {
        await this.mark(row.id, "FAILED", attempts, message);
        return "failed";
      }
      // Deferred: stays QUEUED with a higher attempt count; the poll loop
      // spaces retries via backoffMs(attempts) before the next drain.
      await this.mark(row.id, "QUEUED", attempts, message);
      void backoffMs(attempts);
      return "deferred";
    }
  }

  private async mark(
    id: string,
    status: string,
    attempts: number,
    lastError: string | null,
  ) {
    await this.prisma.notification.update({
      where: { id },
      data: { status, attempts, lastError },
    });
  }
}

export type { PrismaClient };
