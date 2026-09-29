import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { MessagingService } from "./messaging.service.js";
import type { SendMessageDto } from "./messaging.service.js";
import type { Requester } from "../onboarding/onboarding.service.js";

interface AuthedRequest {
  headers: Record<string, string>;
  user?: Requester;
}

/**
 * Rider ↔ driver conversation API (messaging spec §11).
 * Sender identity always comes from the token; client-supplied ids are ignored.
 */
@UseGuards(RolesGuard)
@Controller("conversations")
export class MessagingController {
  constructor(
    @Inject(MessagingService) private readonly messaging: MessagingService,
  ) {}

  @Get("mine")
  @Roles("RIDER")
  mine(@Req() req: AuthedRequest) {
    return this.messaging.myConversations(req.user!.sub);
  }

  @Get("unread-count")
  @Roles("RIDER")
  unreadCount(@Req() req: AuthedRequest) {
    return this.messaging
      .unreadCount(req.user!.sub)
      .then((total) => ({ total }));
  }

  @Get("by-ride/:rideId")
  @Roles("RIDER")
  byRide(@Req() req: AuthedRequest, @Param("rideId") rideId: string) {
    return this.messaging.getByRide(rideId, req.user!.sub);
  }

  @Get(":id")
  @Roles("RIDER")
  detail(@Req() req: AuthedRequest, @Param("id") id: string) {
    return this.messaging.getConversation(id, req.user!.sub);
  }

  @Get(":id/messages")
  @Roles("RIDER")
  messages(
    @Req() req: AuthedRequest,
    @Param("id") id: string,
    @Query("before") before?: string,
    @Query("limit") limit?: string,
  ) {
    return this.messaging.history(
      id,
      req.user!.sub,
      before,
      limit ? Number(limit) : undefined,
    );
  }

  @Post(":id/messages")
  @Roles("RIDER")
  send(
    @Req() req: AuthedRequest,
    @Param("id") id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messaging.sendMessage(id, req.user!.sub, dto);
  }

  @Post(":id/delivered")
  @Roles("RIDER")
  delivered(@Req() req: AuthedRequest, @Param("id") id: string) {
    return this.messaging.markDelivered(id, req.user!.sub);
  }

  @Post(":id/read")
  @Roles("RIDER")
  read(@Req() req: AuthedRequest, @Param("id") id: string) {
    return this.messaging.markRead(id, req.user!.sub);
  }
}
