/**
 * Live co-driver for phone testing (simulator plan §5, API-only).
 *
 * Watches a rider's fresh REQUESTED booking, dispatcher-assigns a driver,
 * accepts as that driver, then walks ARRIVED → IN_PROGRESS → COMPLETED so
 * the phone shows every stage it currently supports.
 *
 * Usage (API must run on LocalStage for devCode OTP):
 *   pnpm --filter @hailing/simulator exec tsx src/drive-booking.ts \
 *     [riderPhone] [driverPhone] [rideId]
 *
 * Defaults: rider 0917100000, driver 0917100011 (motorcycle, online).
 * The rider phone doubles as super-admin for the assign step.
 */
const API = process.env.SIM_API_URL ?? "http://localhost:3001";

/** Demo time-scale: SIM_SPEED=4 crawls 4x faster with 4x shorter pauses. */
const SPEED = Math.max(1, Number(process.env.SIM_SPEED ?? 1));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms / SPEED));

async function call<T>(
  path: string,
  token: string | null,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(`API ${res.status} ${path}: ${body?.message ?? "error"}`);
  }
  return res.json() as Promise<T>;
}

async function login(phone: string): Promise<string> {
  const challenge = await call<{ challengeId: string; devCode?: string }>(
    "/api/auth/otp/request",
    null,
    { method: "POST", body: JSON.stringify({ phone }) },
  );
  if (!challenge.devCode) throw new Error("no dev code (production?)");
  const verified = await call<{ token: string }>("/api/auth/otp/verify", null, {
    method: "POST",
    body: JSON.stringify({
      challengeId: challenge.challengeId,
      code: challenge.devCode,
    }),
  });
  return verified.token;
}

function driverIdFrom(token: string): string {
  // HATOD tokens are body.sig (not JWT): the payload is segment 0.
  const payload = JSON.parse(
    Buffer.from(token.split(".")[0], "base64url").toString(),
  ) as { roles: string[] };
  const role = payload.roles.find((r) => r.startsWith("DRIVER:"));
  if (!role) throw new Error("token carries no DRIVER role");
  return role.slice("DRIVER:".length);
}

interface Mine {
  asRider: {
    id: string;
    status: string;
    pickupLabel: string;
    requestedAt: string;
  }[];
}

async function watchFreshBooking(
  token: string,
  timeoutMs: number,
): Promise<string> {
  const start = Date.now();
  for (;;) {
    const mine = await call<Mine>("/api/rides/mine", token);
    const fresh = mine.asRider.find(
      (r) =>
        r.status === "REQUESTED" &&
        Date.now() - new Date(r.requestedAt).getTime() < 10 * 60 * 1000,
    );
    if (fresh) return fresh.id;
    if (Date.now() - start > timeoutMs) {
      throw new Error(
        "no fresh REQUESTED booking appeared (book on the phone first)",
      );
    }
    await sleep(2000);
  }
}

async function main() {
  const riderPhone = process.argv[2] ?? "0917100000";
  const driverPhone = process.argv[3] ?? "0917100011";
  const rideIdArg = process.argv[4];
  console.log(`api: ${API} | rider: ${riderPhone} | driver: ${driverPhone}`);

  const riderToken = await login(riderPhone);
  console.log("rider logged in (super-admin doubles as dispatcher)");
  const driverToken = await login(driverPhone);
  const driverId = driverIdFrom(driverToken);
  console.log(`driver logged in (id ${driverId})`);
  await call("/api/drivers/me/online", driverToken, {
    method: "POST",
    body: JSON.stringify({ online: true }),
  });
  console.log("driver online");

  const rideId = rideIdArg ?? (await watchFreshBooking(riderToken, 120000));
  console.log(`booking ${rideId} → assigning driver…`);
  await call(`/api/rides/${rideId}/assign`, riderToken, {
    method: "POST",
    body: JSON.stringify({ driverId }),
  });
  console.log("ASSIGNED — phone should show the driver card");

  await call(`/api/rides/${rideId}/accept`, driverToken, {
    method: "POST",
  });
  console.log("accepted — heading to pickup…");
  await call(`/api/rides/${rideId}/transition`, driverToken, {
    method: "POST",
    body: JSON.stringify({ to: "DRIVER_EN_ROUTE" }),
  });
  console.log("DRIVER_EN_ROUTE — phone should show the driver card");

  await crawlToPickup(riderToken, driverToken, rideId);
  await call(`/api/rides/${rideId}/transition`, driverToken, {
    method: "POST",
    body: JSON.stringify({ to: "DRIVER_ARRIVED" }),
  });
  console.log("DRIVER_ARRIVED");

  await sleep(15000);
  await call(`/api/rides/${rideId}/transition`, driverToken, {
    method: "POST",
    body: JSON.stringify({ to: "IN_PROGRESS" }),
  });
  console.log("IN_PROGRESS — driving to the destination…");

  const trip = await call<{
    pickupLat: number;
    pickupLng: number;
    dropoffLat: number | null;
    dropoffLng: number | null;
  }>(`/api/rides/${rideId}`, riderToken);
  if (trip.dropoffLat != null && trip.dropoffLng != null) {
    await crawlAlong(
      driverToken,
      { lat: trip.pickupLat, lng: trip.pickupLng },
      { lat: trip.dropoffLat, lng: trip.dropoffLng },
      30,
      "destination",
    );
  } else {
    await sleep(20000);
  }
  await call(`/api/rides/${rideId}/transition`, driverToken, {
    method: "POST",
    body: JSON.stringify({ to: "COMPLETED" }),
  });
  console.log("COMPLETED — trip done, check Orders for the new entry");
}

const EARTH_KM = 6371;
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

interface LatLng {
  lat: number;
  lng: number;
}

/** Point at distanceKm along bearingDeg from origin. */
function offsetBy(
  origin: LatLng,
  bearingDeg: number,
  distanceKm: number,
): LatLng {
  const b = toRad(bearingDeg);
  const lat1 = toRad(origin.lat);
  const lng1 = toRad(origin.lng);
  const d = distanceKm / EARTH_KM;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(b) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    );
  return { lat: toDeg(lat2), lng: toDeg(lng2) };
}

/**
 * Real-time crawl: spawn 0.8–1.2 km away on a random bearing, ping GPS
 * every 3 s at ~25 km/h toward the pickup until within 60 m.
 * Gives the rider map a genuinely approaching driver marker.
 */
async function crawlToPickup(
  riderToken: string,
  driverToken: string,
  rideId: string,
): Promise<void> {
  const ride = await call<{
    pickupLat: number | null;
    pickupLng: number | null;
  }>(`/api/rides/${rideId}`, riderToken);
  if (ride.pickupLat == null || ride.pickupLng == null) {
    throw new Error("booking has no pickup coordinates");
  }
  const dest: LatLng = { lat: ride.pickupLat, lng: ride.pickupLng };
  const bearing = Math.random() * 360;
  const spawnKm = 0.8 + Math.random() * 0.4;
  const start = offsetBy(dest, bearing, spawnKm);
  const spawnCheck = haversineKm(start, dest);
  console.log(
    `driver spawned ${spawnKm.toFixed(2)} km out ` +
      `(verify ${spawnCheck.toFixed(2)} km), crawling to pickup…`,
  );
  if (spawnCheck < 0.5) throw new Error("spawn math broken, aborting crawl");
  await crawlAlong(driverToken, start, dest, 25, "pickup");
  console.log("driver at pickup");
}

/**
 * Ping GPS every 3 s along the straight-line leg from→to at speedKmh.
 * Straight legs stand in for road routing in the dev simulator; the rider
 * map draws the true road route underneath.
 */
async function crawlAlong(
  driverToken: string,
  from: LatLng,
  to: LatLng,
  baseSpeedKmh: number,
  label: string,
): Promise<void> {
  const speedKmh = baseSpeedKmh * SPEED;
  let pos = from;
  let pings = 0;
  for (;;) {
    const remaining = haversineKm(pos, to);
    if (remaining < 0.06) break;
    await call("/api/drivers/me/location", driverToken, {
      method: "POST",
      body: JSON.stringify({ lat: pos.lat, lng: pos.lng, accuracyM: 8 }),
    });
    pings++;
    if (pings % 10 === 0) {
      console.log(`…${remaining.toFixed(2)} km to ${label} (${pings} pings)`);
    }
    const stepKm = Math.min((speedKmh / 3600) * 3, remaining);
    const y = Math.sin(toRad(to.lng - pos.lng)) * Math.cos(toRad(to.lat));
    const x =
      Math.cos(toRad(pos.lat)) * Math.sin(toRad(to.lat)) -
      Math.sin(toRad(pos.lat)) *
        Math.cos(toRad(to.lat)) *
        Math.cos(toRad(to.lng - pos.lng));
    const brg = (toDeg(Math.atan2(y, x)) + 360) % 360;
    pos = offsetBy(pos, brg, stepKm);
    await sleep(3000);
  }
  await call("/api/drivers/me/location", driverToken, {
    method: "POST",
    body: JSON.stringify({ lat: to.lat, lng: to.lng, accuracyM: 5 }),
  });
}
void main().catch((e: unknown) => {
  console.error(`drive-booking failed: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
