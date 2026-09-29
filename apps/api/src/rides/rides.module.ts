import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { RideTransitionGuard } from "./ride-transition.guard.js";
import { RidesController } from "./rides.controller.js";
import { RidesService } from "./rides.service.js";

@Module({
  imports: [AuthModule],
  controllers: [RidesController],
  providers: [RidesService, RideTransitionGuard],
  exports: [RideTransitionGuard, RidesService],
})
export class RidesModule {}
