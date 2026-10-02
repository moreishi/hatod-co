import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module.js";
import { MatchingModule } from "../matching/matching.module.js";
import { MessagingModule } from "../messaging/messaging.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { RealtimeModule } from "../realtime/realtime.module.js";
import { RideTransitionGuard } from "./ride-transition.guard.js";
import { RidesController } from "./rides.controller.js";
import { RidesService } from "./rides.service.js";

@Module({
  imports: [
    NotificationsModule,
    MessagingModule,
    RealtimeModule,
    MatchingModule,
    BillingModule,
  ],
  controllers: [RidesController],
  providers: [RidesService, RideTransitionGuard],
  exports: [RideTransitionGuard, RidesService],
})
export class RidesModule {}
