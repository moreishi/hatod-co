import { Module } from "@nestjs/common";
import { MessagingModule } from "../messaging/messaging.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { RealtimeModule } from "../realtime/realtime.module.js";
import { RideTransitionGuard } from "./ride-transition.guard.js";
import { RidesController } from "./rides.controller.js";
import { RidesService } from "./rides.service.js";

@Module({
  imports: [NotificationsModule, MessagingModule, RealtimeModule],
  controllers: [RidesController],
  providers: [RidesService, RideTransitionGuard],
  exports: [RideTransitionGuard, RidesService],
})
export class RidesModule {}
