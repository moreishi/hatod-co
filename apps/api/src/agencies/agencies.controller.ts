import {
  Inject,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { parsePage } from "../common/paging.js";
import { AgenciesService } from "./agencies.service.js";
import type {
  CreateAgencyDto,
  CreateVehicleDto,
  UpdateAgencyDto,
} from "./agencies.service.js";
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
  constructor(
    @Inject(AgenciesService) private readonly agencies: AgenciesService,
  ) {}

  @Get()
  @Roles("RIDER")
  list() {
    return this.agencies.listActive();
  }

  @Post()
  @Roles("ADMIN:SUPER_ADMIN")
  create(@Body() dto: CreateAgencyDto) {
    return this.agencies.createAgency(dto);
  }

  @Patch(":id")
  @Roles("ADMIN:SUPER_ADMIN")
  update(@Param("id") id: string, @Body() dto: UpdateAgencyDto) {
    return this.agencies.updateAgency(id, dto);
  }

  @Get("mine")
  @Roles("RIDER")
  mine(@Req() req: AuthedRequest) {
    return this.agencies.myAgencies(requesterOf(req));
  }

  @Get(":id/drivers")
  @Roles("RIDER")
  drivers(
    @Req() req: AuthedRequest,
    @Param("id") id: string,
    @Query("take") take?: string,
    @Query("skip") skip?: string,
  ) {
    return this.agencies.listDrivers(
      id,
      requesterOf(req),
      parsePage({ take, skip }),
    );
  }

  @Get(":id/rides")
  @Roles("RIDER")
  rides(
    @Req() req: AuthedRequest,
    @Param("id") id: string,
    @Query("status") status?: string,
    @Query("take") take?: string,
    @Query("skip") skip?: string,
  ) {
    const statuses = status
      ? status.split(",").map((s) => s.trim())
      : undefined;
    return this.agencies.listRides(
      id,
      statuses,
      requesterOf(req),
      parsePage({ take, skip }),
    );
  }

  @Get(":id/vehicles")
  @Roles("RIDER")
  vehicles(@Req() req: AuthedRequest, @Param("id") id: string) {
    return this.agencies.listVehicles(id, requesterOf(req));
  }

  @Get(":id/drivers/nearby")
  @Roles("RIDER")
  nearby(
    @Req() req: AuthedRequest,
    @Param("id") id: string,
    @Query("lat") lat?: string,
    @Query("lng") lng?: string,
  ) {
    return this.agencies.nearbyDrivers(
      id,
      Number(lat),
      Number(lng),
      requesterOf(req),
    );
  }

  @Get(":id/documents")
  @Roles("RIDER")
  documents(
    @Req() req: AuthedRequest,
    @Param("id") id: string,
    @Query("status") status?: string,
    @Query("q") search?: string,
    @Query("take") take?: string,
    @Query("skip") skip?: string,
  ) {
    return this.agencies.listDocuments(id, status, requesterOf(req), {
      search,
      take: take ? Math.min(100, Math.max(1, Number(take) || 20)) : undefined,
      skip: skip ? Math.max(0, Number(skip) || 0) : undefined,
    });
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
