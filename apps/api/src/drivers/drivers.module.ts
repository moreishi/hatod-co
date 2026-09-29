import { Module } from "@nestjs/common";
import { RidesModule } from "../rides/rides.module.js";
import { DriversController } from "./drivers.controller.js";

@Module({
  imports: [RidesModule],
  controllers: [DriversController],
})
export class DriversModule {}
