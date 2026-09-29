import { SimApi } from "./api.js";
import { DriverAgent, RiderAgent, type AgentLog } from "./agents.js";
import { configFromEnv, scaledMs, type SimConfig } from "./config.js";
import { mulberry32, sleep } from "./random.js";

export interface ScenarioResult {
  scenario: string;
  rideId: string | null;
  events: number;
  chatMessages: number;
  wsEvents: number;
}

export interface SimContext {
  api: SimApi;
  config: SimConfig;
  rand: () => number;
  events: AgentLog[];
}

export function createContext(overrides: Partial<SimConfig> = {}): SimContext {
  const config = { ...configFromEnv(), ...overrides };
  const events: AgentLog[] = [];
  return {
    api: new SimApi(config.apiUrl),
    config,
    rand: mulberry32(config.seed),
    events,
  };
}

async function setupPair(
  ctx: SimContext,
  riderPhone: string,
  driverPhone: string,
) {
  const log = (entry: AgentLog) => ctx.events.push(entry);
  const rider = new RiderAgent(
    ctx.api,
    ctx.config,
    `rider:${riderPhone}`,
    riderPhone,
    ctx.rand,
    log,
  );
  const driver = new DriverAgent(
    ctx.api,
    ctx.config,
    `driver:${driverPhone}`,
    driverPhone,
    ctx.rand,
    log,
  );
  const dispatcherToken = await ctx.api.login(ctx.config.dispatcherPhone);
  await driver.goOnline();
  return { rider, driver, dispatcherToken };
}

async function transition(
  ctx: SimContext,
  dispatcherToken: string,
  rideId: string,
  to: string,
) {
  await ctx.api.transitionRide(dispatcherToken, rideId, to);
  await sleep(scaledMs(1, ctx.config.speed));
}

/** Happy path: request → assign → accept → chat → complete. */
export async function normalRide(ctx: SimContext): Promise<ScenarioResult> {
  const [riderPhone, driverPhone] = [
    ctx.config.riderPhones[0],
    ctx.config.driverPhones[0],
  ];
  const { rider, driver, dispatcherToken } = await setupPair(
    ctx,
    riderPhone,
    driverPhone,
  );
  try {
    const rideId = await rider.runRide("normal_ride");
    await assignDriver(ctx, dispatcherToken, rideId, driverPhone);
    const convo = await driver.awaitAssignment();
    if (!convo) throw new Error("driver never saw the assignment");
    await driver.acceptCurrentRide(rideId);
    rider.joinRide(rideId);
    driver.joinRide(rideId);
    const riderJoined = await rider.joinConversation(convo.id);
    const driverJoined = await driver.joinConversation(convo.id);
    if (!riderJoined || !driverJoined)
      throw new Error("conversation.join rejected");
    await rider.chat(convo.id, 1, `normal-${rideId}`);
    await driver.chat(convo.id, 1, `normal-${rideId}`);
    for (const to of [
      "DRIVER_EN_ROUTE",
      "DRIVER_ARRIVED",
      "IN_PROGRESS",
      "COMPLETED",
    ]) {
      await transition(ctx, dispatcherToken, rideId, to);
    }
    return summarize("normal_ride", rideId, ctx, rider, driver);
  } finally {
    rider.disconnectWs();
    await driver.goOffline().catch(() => undefined);
  }
}

/** Dispatcher assigns a driver by phone through the membership-scoped API. */
export async function assignDriver(
  ctx: SimContext,
  dispatcherToken: string,
  rideId: string,
  driverPhone: string,
): Promise<string> {
  const agencyId = await fetchAgencyId(ctx, dispatcherToken);
  const res = await fetch(
    `${ctx.config.apiUrl}/api/agencies/${agencyId}/drivers`,
    {
      headers: { authorization: `Bearer ${dispatcherToken}` },
    },
  );
  if (!res.ok) throw new Error(`drivers list failed: ${res.status}`);
  const drivers = (await res.json()) as {
    id: string;
    status: string;
    user: { phone: string };
  }[];
  const match = drivers.find(
    (d) => d.user.phone === driverPhone && d.status === "ACTIVE",
  );
  if (!match) throw new Error(`driver ${driverPhone} not dispatchable`);
  await ctx.api.assignRide(dispatcherToken, rideId, match.id);
  return match.id;
}

/** Rider cancels before any assignment; no conversation may exist. */
export async function cancelBeforeAccept(
  ctx: SimContext,
): Promise<ScenarioResult> {
  const [riderPhone, driverPhone] = [
    ctx.config.riderPhones[0],
    ctx.config.driverPhones[0],
  ];
  const { rider, driver } = await setupPair(ctx, riderPhone, driverPhone);
  try {
    const rideId = await rider.runRide("cancel_before_accept");
    return summarize("cancel_before_accept", rideId, ctx, rider, driver);
  } finally {
    rider.disconnectWs();
    await driver.goOffline().catch(() => undefined);
  }
}

/** Dispatcher assigns, driver rejects → ride requeues, chat removed. */
export async function driverReject(ctx: SimContext): Promise<ScenarioResult> {
  const [riderPhone, driverPhone] = [
    ctx.config.riderPhones[0],
    ctx.config.driverPhones[0],
  ];
  const { rider, driver, dispatcherToken } = await setupPair(
    ctx,
    riderPhone,
    driverPhone,
  );
  try {
    const rideId = await rider.runRide("driver_reject");
    await assignDriver(ctx, dispatcherToken, rideId, driverPhone);
    const convo = await driver.awaitAssignment();
    if (!convo) throw new Error("driver never saw the assignment");
    await driver.rejectCurrentRide(rideId);
    return summarize("driver_reject", rideId, ctx, rider, driver);
  } finally {
    rider.disconnectWs();
    await driver.goOffline().catch(() => undefined);
  }
}

async function fetchAgencyId(
  ctx: SimContext,
  dispatcherToken: string,
): Promise<string> {
  const res = await fetch(`${ctx.config.apiUrl}/api/agencies/mine`, {
    headers: { authorization: `Bearer ${dispatcherToken}` },
  });
  const agencies = (await res.json()) as { id: string }[];
  if (agencies.length === 0) throw new Error("dispatcher has no agency");
  return agencies[0].id;
}

function summarize(
  scenario: string,
  rideId: string | null,
  ctx: SimContext,
  rider: RiderAgent,
  driver: DriverAgent,
): ScenarioResult {
  const chatMessages = ctx.events.filter(
    (e) => e.event === "message.sent",
  ).length;
  const wsEvents = rider.seenEvents.length + driver.seenEvents.length;
  return {
    scenario,
    rideId,
    events: ctx.events.length,
    chatMessages,
    wsEvents,
  };
}

export const SCENARIOS: Record<
  string,
  (ctx: SimContext) => Promise<ScenarioResult>
> = {
  normal_ride: normalRide,
  cancel_before_accept: cancelBeforeAccept,
  driver_reject: driverReject,
};
