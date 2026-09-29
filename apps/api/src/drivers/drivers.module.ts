import { Module } from "@nestjs/common";
import { LocationModule } from "../location/location.module.js";
import { RidesModule } from "../rides/rides.module.js";
import { DriversController } from "./drivers.controller.js";

@Module({
  imports: [RidesModule, LocationModule],
  controllers: [DriversController],
})
export class DriversModule {}
