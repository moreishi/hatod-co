import { Controller, Get, Inject, Query, UseGuards } from "@nestjs/common";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { PlacesService } from "./places.service.js";

@UseGuards(RolesGuard)
@Controller("places")
export class PlacesController {
  constructor(@Inject(PlacesService) private readonly places: PlacesService) {}

  @Get("search")
  @Roles("RIDER")
  search(@Query("q") q: string, @Query("area") area: string) {
    return this.places.search(q ?? "", area ?? "");
  }

  @Get("reverse")
  @Roles("RIDER")
  reverse(
    @Query("lat") lat: string,
    @Query("lng") lng: string,
    @Query("detail") detail: string,
  ) {
    return this.places.reverse(Number(lat), Number(lng), detail === "1");
  }
}
