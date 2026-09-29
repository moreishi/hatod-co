import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { AgenciesService } from "./agencies.service.js";
import type { CreateVehicleDto } from "./agencies.service.js";
import type { Requester } from "../onboarding/onboarding.service.js";

interface AuthedRequest {
  headers: Record<string, string>;
  user?: Requester;
}

function requesterOf(req: AuthedRequest): Requester {
  return { sub: req.user!.sub, roles: req.user!.roles ?? [] };
}

@UseGuards(RolesGuard)
@Controller("agencies")
export class AgenciesController {
  constructor(private readonly agencies: AgenciesService) {}

  @Get("mine")
  @Roles("RIDER")
  mine(@Req() req: AuthedRequest) {
    return this.agencies.myAgencies(requesterOf(req));
  }

  @Get(":id/drivers")
  @Roles("RIDER")
  drivers(@Req() req: AuthedRequest, @Param("id") id: string) {
    return this.agencies.listDrivers(id, requesterOf(req));
  }

  @Post(":id/vehicles")
  @Roles("RIDER")
  createVehicle(
    @Req() req: AuthedRequest,
    @Param("id") id: string,
    @Body() dto: CreateVehicleDto,
  ) {
    return this.agencies.createVehicle(id, dto, requesterOf(req));
  }

  @Post("drivers/:id/assign-vehicle")
  @Roles("RIDER")
  assignVehicle(
    @Req() req: AuthedRequest,
    @Param("id") id: string,
    @Body() body: { vehicleId: string },
  ) {
    return this.agencies.assignVehicle(id, body.vehicleId, requesterOf(req));
  }
}
