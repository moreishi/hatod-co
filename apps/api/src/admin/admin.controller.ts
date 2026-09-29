import {
  Inject,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { AdminRole } from "@hailing/constants";
import { Roles, Public } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { AdminService } from "./admin.service.js";
import type { AcceptInviteDto, InviteAdminDto } from "./admin.service.js";
import type { Requester } from "../onboarding/onboarding.service.js";

interface AuthedRequest {
  headers: Record<string, string>;
  user?: Requester;
}

@UseGuards(RolesGuard)
@Controller("admin")
export class AdminController {
  constructor(@Inject(AdminService) private readonly admin: AdminService) {}

  @Post("invitations")
  @Roles("ADMIN:SUPER_ADMIN")
  invite(@Req() req: AuthedRequest, @Body() dto: InviteAdminDto) {
    return this.admin.invite(dto, req.user!.sub);
  }

  @Get("invitations")
  @Roles("ADMIN:SUPER_ADMIN")
  invitations() {
    return this.admin.listInvitations();
  }

  @Post("invitations/:token/accept")
  @Public()
  accept(@Param("token") token: string, @Body() dto: AcceptInviteDto) {
    return this.admin.accept(token, dto);
  }

  @Get("users")
  @Roles("ADMIN:*")
  users() {
    return this.admin.listUsers();
  }

  @Get("rides")
  @Roles("ADMIN:*")
  rides(@Query("status") status?: string) {
    return this.admin.listRides(status);
  }

  @Get("transactions")
  @Roles("ADMIN:*")
  transactions(@Query("type") type?: string) {
    return this.admin.listTransactions(type);
  }

  @Get("finance/summary")
  @Roles("ADMIN:*")
  financeSummary() {
    return this.admin.financeSummary();
  }

  @Get("conversations/:id")
  @Roles("ADMIN:*")
  inspectConversation(@Req() req: AuthedRequest, @Param("id") id: string) {
    return this.admin.inspectConversation(id, req.user!.sub);
  }
}

export type { AdminRole };
