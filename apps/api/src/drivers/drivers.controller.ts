import { Body, Controller, Inject, Post, Req, UseGuards } from "@nestjs/common";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { LocationService, type PingDto } from "../location/location.service.js";
import { RidesService } from "../rides/rides.service.js";
import type { Requester } from "../onboarding/onboarding.service.js";

interface AuthedRequest {
  headers: Record<string, string>;
  user?: Requester;
}

@UseGuards(RolesGuard)
@Controller("drivers")
export class DriversController {
  constructor(
    @Inject(RidesService) private readonly rides: RidesService,
    @Inject(LocationService) private readonly location: LocationService,
  ) {}

  @Post("me/online")
  @Roles("DRIVER:*")
  setOnline(@Req() req: AuthedRequest, @Body() body: { online: boolean }) {
    return this.rides.setOnline(req.user!.sub, body.online === true);
  }

  @Post("me/location")
  @Roles("DRIVER:*")
  ping(@Req() req: AuthedRequest, @Body() dto: PingDto) {
    return this.location.ping(req.user!.sub, dto);
  }
}
