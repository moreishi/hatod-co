import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { RideEventsGateway } from "../realtime/ride-events.gateway.js";
import { RideTransitionGuard } from "./ride-transition.guard.js";
import { RidesController } from "./rides.controller.js";
import { RidesService } from "./rides.service.js";

@Module({
  imports: [NotificationsModule],
  controllers: [RidesController],
  providers: [RidesService, RideTransitionGuard, RideEventsGateway],
  exports: [RideTransitionGuard, RidesService, RideEventsGateway],
})
export class RidesModule {}
