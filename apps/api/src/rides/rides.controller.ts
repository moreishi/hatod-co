import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { RideStatus } from "@hailing/constants";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { RidesService } from "./rides.service.js";
import type { RequestRideDto } from "./rides.service.js";

interface AuthedRequest {
  headers: Record<string, string>;
  user?: { sub: string };
}

/**
 * Every authenticated token carries RIDER, so @Roles("RIDER") means "signed in".
 * Narrower roles gate dispatch and driver actions (spec rule 49).
 */
@UseGuards(RolesGuard)
@Controller("rides")
export class RidesController {
  constructor(private readonly rides: RidesService) {}

  @Post()
  @Roles("RIDER")
  request(@Req() req: AuthedRequest, @Body() dto: RequestRideDto) {
    return this.rides.requestRide(req.user!.sub, dto);
  }

  @Post(":id/assign")
  @Roles("AGENCY:*", "ADMIN:OPS", "ADMIN:SUPER_ADMIN")
  assign(
    @Req() req: AuthedRequest,
    @Param("id") id: string,
    @Body() body: { driverId: string },
  ) {
    return this.rides.assignRide(id, body.driverId, req.user!.sub);
  }

  @Post(":id/transition")
  @Roles("AGENCY:*", "DRIVER:*", "ADMIN:OPS", "ADMIN:SUPER_ADMIN")
  transition(
    @Req() req: AuthedRequest,
    @Param("id") id: string,
    @Body() body: { to: RideStatus; cancelReason?: string },
  ) {
    return this.rides.transitionRide(
      id,
      body.to,
      req.user!.sub,
      body.cancelReason,
    );
  }

  @Get()
  @Roles("RIDER")
  list(@Query("status") status?: RideStatus) {
    return this.rides.listRides(status);
  }

  @Get(":id")
  @Roles("RIDER")
  detail(@Param("id") id: string) {
    return this.rides.getRide(id);
  }
}
