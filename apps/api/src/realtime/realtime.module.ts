import { Module } from "@nestjs/common";
import { RideEventsGateway } from "./ride-events.gateway.js";

@Module({
  providers: [RideEventsGateway],
  exports: [RideEventsGateway],
})
export class RealtimeModule {}
