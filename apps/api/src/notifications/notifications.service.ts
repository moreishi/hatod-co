import { Injectable } from "@nestjs/common";
import type { NotificationChannel } from "@hailing/constants";
import type { TemplateName } from "@hailing/notifications";
import { Templates } from "@hailing/notifications";
import { PrismaService } from "../prisma/prisma.service.js";

export interface EnqueueDto {
  userId?: string;
  channel: NotificationChannel;
  to: string;
  template: TemplateName;
  variables: Record<string, string | number>;
}

/**
 * Durable outbox (spec §47). API writes QUEUED rows; the worker delivers.
 * Domain modules enqueue here — never call a concrete provider directly.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async enqueue(dto: EnqueueDto) {
    return this.prisma.notification.create({
      data: {
        userId: dto.userId,
        channel: dto.channel,
        template: Templates[dto.template],
        payload: JSON.stringify({ to: dto.to, variables: dto.variables }),
        status: "QUEUED",
      },
    });
  }

  listMine(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }
}
