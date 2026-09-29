import { describe, expect, it, vi } from "vitest";
import { RideEventsGateway } from "../src/realtime/ride-events.gateway.js";

function gatewayWith(overrides: { prisma?: object; messaging?: object } = {}) {
  const emit = vi.fn();
  const to = vi.fn().mockReturnValue({ emit });
  const server = { to };
  const joined: string[] = [];
  const tokens = {
    verify: vi.fn().mockReturnValue({ sub: "u-1", roles: ["RIDER"] }),
  };
  const prisma = {
    conversation: { findUnique: vi.fn() },
    ride: { findUnique: vi.fn() },
    ...overrides.prisma,
  };
  const messaging = {
    sendMessage: vi.fn().mockResolvedValue({ id: "m-1" }),
    markDelivered: vi.fn().mockResolvedValue({ delivered: 1 }),
    markRead: vi.fn().mockResolvedValue({ read: 1 }),
    ...overrides.messaging,
  };
  const moduleRef = { get: vi.fn().mockReturnValue(messaging) };
  const gateway = new RideEventsGateway(
    tokens as never,
    prisma as never,
    moduleRef as never,
  );
  (gateway as unknown as { server: unknown }).server = server;
  const client = (extra: object = {}) => {
    const socket = {
      id: `sock-${Math.random()}`,
      data: {} as Record<string, unknown>,
      handshake: { auth: { token: "tok" }, query: {} },
      join: vi.fn().mockImplementation((room: string) => {
        joined.push(room);
        return Promise.resolve();
      }),
      disconnect: vi.fn(),
      ...extra,
    };
    return socket as unknown as import("socket.io").Socket;
  };
  return { gateway, to, emit, joined, tokens, prisma, client };
}

describe("RideEventsGateway rooms", () => {
  it("broadcasts ride updates to the ride room", () => {
    const { gateway, to, emit } = gatewayWith();
    gateway.broadcastRide({
      rideId: "ride-1",
      status: "ASSIGNED",
      agencyId: "ag-1",
      driverId: "d-1",
    });
    expect(to).toHaveBeenCalledWith("ride:ride-1");
    expect(emit).toHaveBeenCalledWith(
      "ride.updated",
      expect.objectContaining({ rideId: "ride-1", status: "ASSIGNED" }),
    );
  });

  it("broadcasts dispatch events to the agency room", () => {
    const { gateway, to, emit } = gatewayWith();
    gateway.broadcastRide({
      rideId: "ride-1",
      status: "REQUESTED",
      agencyId: "ag-1",
      driverId: null,
    });
    expect(to).toHaveBeenCalledWith("agency:ag-1");
    expect(emit).toHaveBeenCalledWith(
      "dispatch.updated",
      expect.objectContaining({ rideId: "ride-1" }),
    );
  });

  it("broadcasts conversation events to the conversation room", () => {
    const { gateway, to, emit } = gatewayWith();
    gateway.broadcastConversation("c-1", "message.created", {
      messageId: "m-1",
    });
    expect(to).toHaveBeenCalledWith("conversation:c-1");
    expect(emit).toHaveBeenCalledWith(
      "message.created",
      expect.objectContaining({ conversationId: "c-1", messageId: "m-1" }),
    );
  });
});

describe("RideEventsGateway auth (messaging spec §10)", () => {
  it("disconnects sockets without a valid token", () => {
    const { gateway, client, tokens } = gatewayWith();
    tokens.verify.mockImplementation(() => {
      throw new Error("bad");
    });
    const socket = client({ handshake: { auth: {}, query: {} } });
    gateway.handleConnection(socket);
    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });

  it("joins conversation rooms only for participants", async () => {
    const { gateway, client, prisma, joined } = gatewayWith({
      prisma: {
        conversation: {
          findUnique: vi
            .fn()
            .mockResolvedValue({ id: "c-1", riderId: "u-1", driverId: "u-2" }),
        },
        ride: { findUnique: vi.fn() },
      },
    });
    const socket = client();
    gateway.handleConnection(socket);
    expect(joined).toContain("user:u-1");
    await expect(
      gateway.handleConversationJoin(socket, "c-1"),
    ).resolves.toEqual({ ok: true });
    expect(joined).toContain("conversation:c-1");
    expect(gateway.isViewing("u-1", "c-1")).toBe(true);
    expect(gateway.isViewing("u-2", "c-1")).toBe(false);
    expect(gateway.isOnline("u-1")).toBe(true);
    expect(gateway.isOnline("u-9")).toBe(false);
    void prisma;
  });

  it("refuses conversation rooms to non-participants", async () => {
    const { gateway, client } = gatewayWith({
      prisma: {
        conversation: {
          findUnique: vi
            .fn()
            .mockResolvedValue({ id: "c-1", riderId: "u-7", driverId: "u-8" }),
        },
        ride: { findUnique: vi.fn() },
      },
    });
    const socket = client();
    gateway.handleConnection(socket);
    await expect(
      gateway.handleConversationJoin(socket, "c-1"),
    ).resolves.toEqual({ ok: false });
    expect(gateway.isViewing("u-1", "c-1")).toBe(false);
  });

  it("sends chat over the socket with server-resolved identity", async () => {
    const { gateway, client } = gatewayWith();
    const authed = client();
    gateway.handleConnection(authed);
    await expect(
      gateway.handleMessageSend(authed, {
        conversationId: "c-1",
        content: "hi",
      }),
    ).resolves.toMatchObject({ ok: true, messageId: "m-1" });
    const anon = client({ data: {} });
    await expect(
      gateway.handleMessageSend(anon, {
        conversationId: "c-1",
        content: "hi",
      }),
    ).resolves.toMatchObject({ ok: false });
  });

  it("syncs receipts over the socket after reconnect", async () => {
    const { gateway, client } = gatewayWith();
    const socket = client();
    gateway.handleConnection(socket);
    await expect(
      gateway.handleMessageDelivered(socket, "c-1"),
    ).resolves.toMatchObject({ ok: true, delivered: 1 });
    await expect(
      gateway.handleMessageRead(socket, "c-1"),
    ).resolves.toMatchObject({ ok: true, read: 1 });
  });
});
