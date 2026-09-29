import { Module } from "@nestjs/common";
import { MessagingModule } from "../messaging/messaging.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { RealtimeModule } from "../realtime/realtime.module.js";
import { MatchingService } from "./matching.service.js";

@Module({
  imports: [NotificationsModule, MessagingModule, RealtimeModule],
  providers: [MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}
