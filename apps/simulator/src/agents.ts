import { io, type Socket } from "socket.io-client";
import { SimApi } from "./api.js";
import { scaledMs, type SimConfig } from "./config.js";
import { pick, sleep } from "./random.js";

export interface AgentLog {
  at: string;
  agent: string;
  event: string;
  detail?: string;
}

/** Shared agent plumbing: login, WS with token auth, scripted chat lines. */
export abstract class Agent {
  protected token = "";
  protected socket: Socket | null = null;
  readonly seenEvents: string[] = [];

  constructor(
    protected readonly api: SimApi,
    protected readonly config: SimConfig,
    readonly name: string,
    readonly phone: string,
    protected readonly rand: () => number,
    protected readonly log: (entry: AgentLog) => void,
  ) {}

  protected emit(event: string, detail?: string) {
    this.log({ at: new Date().toISOString(), agent: this.name, event, detail });
  }

  async login() {
    this.token = await this.api.login(this.phone);
    this.emit("login");
  }

  connectWs() {
    this.socket = io(`${this.apiUrl().replace(/\/$/, "")}/realtime`, {
      auth: { token: this.token },
    });
    this.socket.on("connect", () => this.emit("ws-connected"));
    this.socket.on("ride.updated", (e: { rideId: string; status: string }) => {
      this.seenEvents.push(`ride:${e.status}`);
      this.emit("ride.updated", `${e.rideId} -> ${e.status}`);
    });
    this.socket.on("message.created", (e: { messageId: string }) => {
      this.seenEvents.push("message:created");
      this.emit("message.created", e.messageId);
    });
    this.socket.on("disconnect", () => this.emit("ws-disconnected"));
  }

  disconnectWs() {
    this.socket?.disconnect();
    this.socket = null;
  }

  joinRide(rideId: string) {
    this.socket?.emit("ride.join", rideId);
  }

  async joinConversation(conversationId: string): Promise<boolean> {
    if (!this.socket) return false;
    const ok = await this.socket
      .emitWithAck("conversation.join", conversationId)
      .catch(() => null);
    return (ok as { ok?: boolean } | null)?.ok === true;
  }

  private apiUrl() {
    return this.config.apiUrl;
  }
}

const RIDER_LINES = [
  "Where are you?",
  "I'm at the gate.",
  "Thanks, see you soon!",
];
const DRIVER_LINES = ["On my way.", "Almost there.", "I'm here now."];

export class RiderAgent extends Agent {
  async runRide(scenario: string): Promise<string> {
    await this.login();
    this.connectWs();
    const ride = await this.api.requestRide(this.token, {
      pickupLabel: "Sim Pickup",
      pickupBrgyCode: "072217001",
      dropoffLabel: "Sim Drop",
      dropoffBrgyCode: "072217002",
      distanceKm: 3,
      vehicleType: "SEDAN",
      paymentMethod: "CASH",
    });
    this.emit("ride.requested", ride.id);
    if (scenario === "cancel_before_accept") {
      await this.api.transitionRide(
        this.token,
        ride.id,
        "CANCELLED",
        "sim changed mind",
      );
      this.emit("ride.cancelled", ride.id);
      return ride.id;
    }
    return ride.id;
  }

  async chat(conversationId: string, n: number, tag: string) {
    for (let i = 0; i < n; i += 1) {
      await this.api.sendMessage(
        this.token,
        conversationId,
        pick(this.rand, RIDER_LINES),
        `${tag}-rider-${i}`,
      );
      this.emit("message.sent", conversationId);
      await sleep(scaledMs(1, this.config.speed));
    }
  }
}

export class DriverAgent extends Agent {
  async goOnline() {
    await this.login();
    await this.api.setOnline(this.token, true);
    this.connectWs();
    this.emit("online");
  }

  async goOffline() {
    try {
      await this.api.setOnline(this.token, false);
    } finally {
      this.disconnectWs();
      this.emit("offline");
    }
  }

  /** Discover the assignment through the conversation list (real client path). */
  async awaitAssignment(
    timeoutMs = 15000,
  ): Promise<{ id: string; rideId: string } | null> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const convos = await this.api.myConversations(this.token);
      if (convos.length > 0) return convos[0];
      await sleep(500);
    }
    return null;
  }

  async acceptCurrentRide(rideId: string) {
    await this.api.acceptRide(this.token, rideId);
    this.emit("ride.accepted", rideId);
  }

  async rejectCurrentRide(rideId: string) {
    await this.api.rejectRide(this.token, rideId);
    this.emit("ride.rejected", rideId);
  }

  async chat(conversationId: string, n: number, tag: string) {
    for (let i = 0; i < n; i += 1) {
      await this.api.sendMessage(
        this.token,
        conversationId,
        pick(this.rand, DRIVER_LINES),
        `${tag}-driver-${i}`,
      );
      this.emit("message.sent", conversationId);
      await sleep(scaledMs(1, this.config.speed));
    }
  }
}
