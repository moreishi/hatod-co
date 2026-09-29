import { Module } from "@nestjs/common";
import { LocationModule } from "../location/location.module.js";
import { MatchingModule } from "../matching/matching.module.js";
import { RidesModule } from "../rides/rides.module.js";
import { DriversController } from "./drivers.controller.js";

@Module({
  imports: [RidesModule, LocationModule, MatchingModule],
  controllers: [DriversController],
})
export class DriversModule {}
