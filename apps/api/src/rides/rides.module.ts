import { Module } from "@nestjs/common";
import { RideTransitionGuard } from "./ride-transition.guard.js";

@Module({
  providers: [RideTransitionGuard],
  exports: [RideTransitionGuard],
})
export class RidesModule {}
