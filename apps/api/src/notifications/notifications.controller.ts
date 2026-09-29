import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { NotificationsService } from "./notifications.service.js";
import type { Requester } from "../onboarding/onboarding.service.js";

interface AuthedRequest {
  headers: Record<string, string>;
  user?: Requester;
}

@UseGuards(RolesGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get("mine")
  @Roles("RIDER")
  mine(@Req() req: AuthedRequest) {
    return this.notifications.listMine(req.user!.sub);
  }
}
