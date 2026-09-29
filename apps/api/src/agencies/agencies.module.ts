import { Module } from "@nestjs/common";
import { LocationModule } from "../location/location.module.js";
import { AgenciesController } from "./agencies.controller.js";
import { AgenciesService } from "./agencies.service.js";

@Module({
  imports: [LocationModule],
  controllers: [AgenciesController],
  providers: [AgenciesService],
  exports: [AgenciesService],
})
export class AgenciesModule {}
