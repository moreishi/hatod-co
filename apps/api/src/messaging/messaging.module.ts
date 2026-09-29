import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { MESSAGING_SERVICE } from "../realtime/ride-events.gateway.js";
import { RealtimeModule } from "../realtime/realtime.module.js";
import { MessagingController } from "./messaging.controller.js";
import { MessagingService } from "./messaging.service.js";

@Module({
  imports: [NotificationsModule, RealtimeModule],
  controllers: [MessagingController],
  providers: [
    MessagingService,
    { provide: MESSAGING_SERVICE, useExisting: MessagingService },
  ],
  exports: [MessagingService, MESSAGING_SERVICE],
})
export class MessagingModule {}
