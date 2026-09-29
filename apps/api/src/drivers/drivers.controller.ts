import { Body, Controller, Inject, Post, Req, UseGuards } from "@nestjs/common";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { RidesService } from "../rides/rides.service.js";
import type { Requester } from "../onboarding/onboarding.service.js";

interface AuthedRequest {
  headers: Record<string, string>;
  user?: Requester;
}

@UseGuards(RolesGuard)
@Controller("drivers")
export class DriversController {
  constructor(@Inject(RidesService) private readonly rides: RidesService) {}

  @Post("me/online")
  @Roles("DRIVER:*")
  setOnline(@Req() req: AuthedRequest, @Body() body: { online: boolean }) {
    return this.rides.setOnline(req.user!.sub, body.online === true);
  }
}
