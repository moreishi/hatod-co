/**
 * Simulated passenger for live driver-phone testing (DEV ONLY).
 *
 * Books a MOTORCYCLE ride as a seeded rider, with the pickup pinned to the
 * given driver's latest GPS ping so auto-match stays within radius.
 * Refuses to book when the driver has no fresh ping (go ONLINE first).
 *
 * Usage:
 *   pnpm --filter @hailing/api exec tsx prisma/passenger-booking.ts \
 *     [riderPhone] [driverPhone]
 *
 * Defaults: rider 0917100031, driver 0917100011.
 */
import { PrismaClient } from "@prisma/client";

const API = process.env.SIM_API_URL ?? "http://localhost:3001";
const riderPhone = process.argv[2] ?? "0917100031";
const driverPhone = process.argv[3] ?? "0917100011";
const tipCentavos = Number(process.argv[4] ?? 2000);
const changeFor =
  process.argv[5] === "none" ? undefined : Number(process.argv[5] ?? 100000);
const riderNote =
  process.argv[6] === "none"
    ? ""
    : (process.argv[6] ?? "Gate 2, blue house (sim)");

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

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { phone: driverPhone },
    include: { driverProfile: true },
  });
  const driver = user?.driverProfile;
  if (!user || !driver) throw new Error(`no driver for ${driverPhone}`);
  const ping = await prisma.locationPing.findFirst({
    where: { driverId: driver.id },
    orderBy: { recordedAt: "desc" },
  });
  const ageSec = ping
    ? Math.round((Date.now() - ping.recordedAt.getTime()) / 1000)
    : null;
  console.log(
    `driver ping: ${ping ? `${ping.lat},${ping.lng} (${ageSec}s ago)` : "none"}`,
  );
  if (ping == null || (ageSec ?? 9999) > 120) {
    throw new Error(
      "driver ping missing or stale — toggle ONLINE on the driver app first",
    );
  }

  const token = await login(riderPhone);
  const ride = await call<{ id: string; status: string }>("/api/rides", token, {
    method: "POST",
    body: JSON.stringify({
      pickupLabel: "Sim passenger pickup",
      pickupBrgyCode: "072217001",
      pickupLat: ping.lat,
      pickupLng: ping.lng,
      dropoffLabel: "Sim destination (2km north)",
      dropoffBrgyCode: "072217002",
      dropoffLat: ping.lat + 0.018,
      dropoffLng: ping.lng,
      distanceKm: 2.0,
      vehicleType: "MOTORCYCLE",
      paymentMethod: "CASH",
      tipCentavos,
      changeFor,
      riderNote,
    }),
  });
  console.log(`booked ${ride.id} → ${ride.status} (auto-match offering now)`);
  await prisma.$disconnect();
}

main().catch(async (e: Error) => {
  console.error(`passenger failed: ${e.message}`);
  await prisma.$disconnect();
  process.exit(1);
});
