import { Injectable } from "@nestjs/common";
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import type { RideStatus } from "@hailing/constants";

export interface RideBroadcast {
  rideId: string;
  status: RideStatus;
  agencyId: string | null;
  driverId: string | null;
}

/**
 * Realtime ride/dispatch feed (spec realtime rules).
 * LocalStage broadcasts in-process; production swaps the socket.io Redis
 * adapter without touching this class or its callers.
 */
@Injectable()
@WebSocketGateway({ cors: { origin: true }, namespace: "realtime" })
export class RideEventsGateway {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    const rideId = client.handshake.query.rideId;
    if (typeof rideId === "string" && rideId)
      void client.join(`ride:${rideId}`);
    const agencyId = client.handshake.query.agencyId;
    if (typeof agencyId === "string" && agencyId)
      void client.join(`agency:${agencyId}`);
  }

  @SubscribeMessage("ride.join")
  handleRideJoin(client: Socket, rideId: string) {
    if (typeof rideId === "string" && rideId)
      void client.join(`ride:${rideId}`);
  }

  @SubscribeMessage("agency.join")
  handleAgencyJoin(client: Socket, agencyId: string) {
    if (typeof agencyId === "string" && agencyId)
      void client.join(`agency:${agencyId}`);
  }

  broadcastRide(event: RideBroadcast) {
    this.server.to(`ride:${event.rideId}`).emit("ride.updated", event);
    if (event.agencyId) {
      this.server
        .to(`agency:${event.agencyId}`)
        .emit("dispatch.updated", event);
    }
  }
}
