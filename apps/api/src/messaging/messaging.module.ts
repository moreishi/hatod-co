import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { RealtimeModule } from "../realtime/realtime.module.js";
import { MessagingController } from "./messaging.controller.js";
import { MessagingService } from "./messaging.service.js";

@Module({
  imports: [NotificationsModule, RealtimeModule],
  controllers: [MessagingController],
  providers: [MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
