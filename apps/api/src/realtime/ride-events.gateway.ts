import { Inject, Injectable } from "@nestjs/common";
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import type { RideStatus } from "@hailing/constants";
import { TokenService } from "../auth/token.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

export interface RideBroadcast {
  rideId: string;
  status: RideStatus;
  agencyId: string | null;
  driverId: string | null;
}

interface AuthedData {
  userId: string;
}

/**
 * Realtime ride/dispatch/messaging feed (spec realtime rules + messaging §10).
 * LocalStage broadcasts in-process; production swaps the socket.io Redis
 * adapter without touching this class or its callers.
 *
 * Authentication: clients present their API token in the handshake
 * (`auth.token`). Without a valid token the socket is disconnected.
 * Room joins are authorized: ride/agency rooms by token roles, conversation
 * rooms by participant membership checked against the database.
 */
@Injectable()
@WebSocketGateway({ cors: { origin: true }, namespace: "realtime" })
export class RideEventsGateway {
  @WebSocketServer()
  server!: Server;

  /** userId -> socket ids (presence for push decisions). */
  private readonly presence = new Map<string, Set<string>>();
  /** socketId -> conversation ids the socket explicitly joined. */
  private readonly viewing = new Map<string, Set<string>>();

  constructor(
    @Inject(TokenService) private readonly tokens: TokenService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  handleConnection(client: Socket) {
    const session = this.authenticate(client);
    if (!session) {
      client.disconnect(true);
      return;
    }
    client.data.userId = session.sub;
    client.data.roles = session.roles;
    this.trackPresence(session.sub, client.id, true);
    void client.join(`user:${session.sub}`);
    const rideId = client.handshake.query.rideId;
    if (typeof rideId === "string" && rideId)
      void this.joinRide(client, rideId);
    const agencyId = client.handshake.query.agencyId;
    if (typeof agencyId === "string" && agencyId)
      this.joinAgency(client, agencyId);
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId as string | undefined;
    if (userId) this.trackPresence(userId, client.id, false);
    this.viewing.delete(client.id);
  }

  @SubscribeMessage("ride.join")
  async handleRideJoin(client: Socket, rideId: string) {
    if (typeof rideId === "string" && rideId)
      await this.joinRide(client, rideId);
  }

  @SubscribeMessage("agency.join")
  handleAgencyJoin(client: Socket, agencyId: string) {
    if (typeof agencyId === "string" && agencyId)
      this.joinAgency(client, agencyId);
  }

  private async joinRide(client: Socket, rideId: string) {
    const userId = client.data.userId as string | undefined;
    if (!userId) return;
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: { driver: { select: { userId: true } } },
    });
    if (!ride) return;
    const roles = (client.data.roles ?? []) as string[];
    const allowed =
      ride.riderId === userId ||
      ride.driver?.userId === userId ||
      roles.some((r) => r.startsWith("ADMIN:"));
    if (allowed) void client.join(`ride:${rideId}`);
  }

  private joinAgency(client: Socket, agencyId: string) {
    const roles = (client.data.roles ?? []) as string[];
    if (
      roles.some(
        (r) => r.startsWith(`AGENCY:${agencyId}:`) || r.startsWith("ADMIN:"),
      )
    ) {
      void client.join(`agency:${agencyId}`);
    }
  }

  /** Join a conversation room after verifying participant membership. */
  @SubscribeMessage("conversation.join")
  async handleConversationJoin(client: Socket, conversationId: string) {
    const userId = client.data.userId as string | undefined;
    if (!userId || typeof conversationId !== "string") return { ok: false };
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (
      !conversation ||
      (conversation.riderId !== userId && conversation.driverId !== userId)
    ) {
      return { ok: false };
    }
    await client.join(`conversation:${conversationId}`);
    let set = this.viewing.get(client.id);
    if (!set) {
      set = new Set();
      this.viewing.set(client.id, set);
    }
    set.add(conversationId);
    return { ok: true };
  }

  broadcastRide(event: RideBroadcast) {
    this.server.to(`ride:${event.rideId}`).emit("ride.updated", event);
    if (event.agencyId) {
      this.server
        .to(`agency:${event.agencyId}`)
        .emit("dispatch.updated", event);
    }
  }

  broadcastConversation(
    conversationId: string,
    event: string,
    payload: object,
  ) {
    this.server.to(`conversation:${conversationId}`).emit(event, {
      conversationId,
      ...payload,
    });
  }

  /** True when the user has the conversation open on any socket. */
  isViewing(userId: string, conversationId: string): boolean {
    for (const socketId of this.presence.get(userId) ?? []) {
      if (this.viewing.get(socketId)?.has(conversationId)) return true;
    }
    return false;
  }

  /** True when the user holds any live socket. */
  isOnline(userId: string): boolean {
    return (this.presence.get(userId)?.size ?? 0) > 0;
  }

  private authenticate(
    client: Socket,
  ): { sub: string; roles: string[] } | null {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      (client.handshake.query.token as string | undefined);
    if (!token) return null;
    try {
      const payload = this.tokens.verify(token);
      return { sub: payload.sub, roles: payload.roles };
    } catch {
      return null;
    }
  }

  private trackPresence(userId: string, socketId: string, online: boolean) {
    let set = this.presence.get(userId);
    if (!set) {
      set = new Set();
      this.presence.set(userId, set);
    }
    if (online) set.add(socketId);
    else {
      set.delete(socketId);
      if (set.size === 0) this.presence.delete(userId);
    }
  }
}

export type { AuthedData };
