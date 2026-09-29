import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ConversationStatus,
  MAX_MESSAGE_LENGTH,
  MAX_MESSAGES_PER_CONVERSATION_PER_MINUTE,
  MAX_MESSAGES_PER_MINUTE,
  MESSAGE_PAGE_SIZE,
  MessageStatus,
  MessageType,
} from "@hailing/constants";
import { PrismaService } from "../prisma/prisma.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { RideEventsGateway } from "../realtime/ride-events.gateway.js";

export interface SendMessageDto {
  type?: MessageType;
  content: string;
  clientMessageId?: string;
}

interface ConversationRow {
  id: string;
  rideId: string;
  riderId: string;
  driverId: string;
  status: string;
}

const SYSTEM_TEXTS: Record<string, string> = {
  ASSIGNED: "Driver accepted the booking.",
  DRIVER_ARRIVED: "Driver arrived.",
  IN_PROGRESS: "Ride started.",
  COMPLETED: "Ride completed.",
  CANCELLED: "Ride cancelled.",
};

/**
 * Rider ↔ assigned-driver messaging (messaging spec).
 * One conversation per ride, participants only, sender always resolved
 * from the token. Persist first, distribute second.
 */
@Injectable()
export class MessagingService {
  /** Per-sender send timestamps for rate limiting (single instance; Redis in prod). */
  private readonly sendLog = new Map<string, number[]>();

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationsService)
    private readonly notifications: NotificationsService,
    @Inject(RideEventsGateway) private readonly realtime: RideEventsGateway,
  ) {}

  /** Idempotent conversation creation on driver assignment. */
  async ensureConversation(
    rideId: string,
    riderId: string,
    driverUserId: string,
  ) {
    const existing = await this.prisma.conversation.findUnique({
      where: { rideId },
    });
    if (existing) return existing;
    try {
      return await this.prisma.conversation.create({
        data: {
          rideId,
          riderId,
          driverId: driverUserId,
          status: ConversationStatus.ACTIVE,
        },
      });
    } catch {
      // Lost a creation race: the UNIQUE(rideId) winner stands.
      return this.prisma.conversation.findUniqueOrThrow({ where: { rideId } });
    }
  }

  /** Backend-generated booking event message (clients can never send these). */
  async postSystemMessage(rideId: string, rideStatus: string) {
    const text = SYSTEM_TEXTS[rideStatus];
    if (!text) return null;
    const conversation = await this.prisma.conversation.findUnique({
      where: { rideId },
    });
    if (!conversation || conversation.status !== ConversationStatus.ACTIVE)
      return null;
    return this.persistAndFanOut(
      conversation as ConversationRow,
      conversation.driverId,
      {
        type: MessageType.SYSTEM,
        content: text,
      },
    );
  }

  async closeConversation(rideId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { rideId },
    });
    if (!conversation || conversation.status === ConversationStatus.CLOSED)
      return conversation;
    return this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { status: ConversationStatus.CLOSED, closedAt: new Date() },
    });
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    dto: SendMessageDto,
  ) {
    const conversation = await this.assertWritable(conversationId, senderId);
    const type = dto.type ?? MessageType.TEXT;
    if (type !== MessageType.TEXT) {
      throw new BadRequestException(
        "only TEXT messages may be sent by clients",
      );
    }
    const content = dto.content?.trim() ?? "";
    if (content.length < 1)
      throw new BadRequestException("message must not be empty");
    if (content.length > MAX_MESSAGE_LENGTH) {
      throw new BadRequestException(
        `message exceeds ${MAX_MESSAGE_LENGTH} characters`,
      );
    }
    this.checkRateLimit(senderId, conversationId);
    if (dto.clientMessageId) {
      const duplicate = await this.prisma.message.findUnique({
        where: {
          conversationId_senderId_clientMessageId: {
            conversationId,
            senderId,
            clientMessageId: dto.clientMessageId,
          },
        },
      });
      if (duplicate) return duplicate;
    }
    return this.persistAndFanOut(conversation, senderId, {
      type,
      content,
      clientMessageId: dto.clientMessageId,
    });
  }

  async history(
    conversationId: string,
    userId: string,
    before?: string,
    limit?: number,
  ) {
    const conversation = await this.assertParticipant(conversationId, userId);
    void conversation;
    const take = Math.min(100, Math.max(1, limit ?? MESSAGE_PAGE_SIZE));
    let cursor: { createdAt: Date; id: string } | undefined;
    if (before) {
      const anchor = await this.prisma.message.findUniqueOrThrow({
        where: { id: before },
      });
      if (anchor.conversationId !== conversationId) {
        throw new BadRequestException("cursor belongs to another conversation");
      }
      cursor = { createdAt: anchor.createdAt, id: anchor.id };
    }
    return this.prisma.message.findMany({
      where: {
        conversationId,
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                { createdAt: cursor.createdAt, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
    });
  }

  async markDelivered(conversationId: string, userId: string) {
    await this.assertParticipant(conversationId, userId);
    const result = await this.prisma.message.updateMany({
      where: {
        conversationId,
        recipientId: userId,
        status: MessageStatus.SENT,
      },
      data: { status: MessageStatus.DELIVERED, deliveredAt: new Date() },
    });
    this.realtime.broadcastConversation(conversationId, "message.delivered", {
      userId,
    });
    return { delivered: result.count };
  }

  async markRead(conversationId: string, userId: string) {
    await this.assertParticipant(conversationId, userId);
    const result = await this.prisma.message.updateMany({
      where: {
        conversationId,
        recipientId: userId,
        status: { in: [MessageStatus.SENT, MessageStatus.DELIVERED] },
      },
      data: { status: MessageStatus.READ, readAt: new Date() },
    });
    this.realtime.broadcastConversation(conversationId, "message.read", {
      userId,
    });
    return { read: result.count };
  }

  async unreadCount(userId: string) {
    return this.prisma.message.count({
      where: { recipientId: userId, readAt: null },
    });
  }

  async myConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { OR: [{ riderId: userId }, { driverId: userId }] },
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
    });
    return Promise.all(
      conversations.map(async (c) => ({
        ...c,
        unread: await this.prisma.message.count({
          where: { conversationId: c.id, recipientId: userId, readAt: null },
        }),
      })),
    );
  }

  async getConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException("conversation not found");
    return this.assertParticipant(conversationId, userId);
  }

  async getByRide(rideId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { rideId },
    });
    if (!conversation)
      throw new NotFoundException("no conversation for this ride");
    return this.assertParticipant(conversation.id, userId);
  }

  private async assertParticipant(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
    });
    if (conversation.riderId !== userId && conversation.driverId !== userId) {
      throw new ForbiddenException("not a participant of this conversation");
    }
    return conversation as ConversationRow;
  }

  private async assertWritable(conversationId: string, senderId: string) {
    const conversation = await this.assertParticipant(conversationId, senderId);
    if (conversation.status !== ConversationStatus.ACTIVE) {
      throw new BadRequestException(`conversation is ${conversation.status}`);
    }
    return conversation;
  }

  private checkRateLimit(senderId: string, conversationId: string) {
    const now = Date.now();
    const windowStart = now - 60_000;
    const senderHits = (this.sendLog.get(`u:${senderId}`) ?? []).filter(
      (t) => t > windowStart,
    );
    const convoHits = (
      this.sendLog.get(`c:${conversationId}:${senderId}`) ?? []
    ).filter((t) => t > windowStart);
    if (senderHits.length >= MAX_MESSAGES_PER_MINUTE) {
      throw new BadRequestException("rate limit exceeded, slow down");
    }
    if (convoHits.length >= MAX_MESSAGES_PER_CONVERSATION_PER_MINUTE) {
      throw new BadRequestException(
        "rate limit exceeded for this conversation",
      );
    }
    this.sendLog.set(`u:${senderId}`, [...senderHits, now]);
    this.sendLog.set(`c:${conversationId}:${senderId}`, [...convoHits, now]);
  }

  private async persistAndFanOut(
    conversation: ConversationRow,
    senderId: string,
    msg: { type: MessageType; content: string; clientMessageId?: string },
  ) {
    const recipientId =
      senderId === conversation.riderId
        ? conversation.driverId
        : conversation.riderId;
    if (
      senderId !== conversation.riderId &&
      senderId !== conversation.driverId
    ) {
      throw new ForbiddenException("not a participant of this conversation");
    }
    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId,
        recipientId,
        type: msg.type,
        content: msg.content,
        clientMessageId: msg.clientMessageId,
        status: MessageStatus.SENT,
      },
    });
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageId: message.id, lastMessageAt: message.createdAt },
    });
    this.realtime.broadcastConversation(conversation.id, "message.created", {
      messageId: message.id,
    });
    if (!this.realtime.isViewing(recipientId, conversation.id)) {
      await this.notifications.enqueue({
        userId: recipientId,
        channel: "PUSH",
        to: recipientId,
        template: "NEW_MESSAGE",
        variables: {
          sender: senderId === conversation.driverId ? "driver" : "rider",
        },
      });
    }
    return message;
  }
}
