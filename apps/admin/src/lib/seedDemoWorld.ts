import type { DatabaseSync } from "node:sqlite";
import { calculateFare } from "./fare";
import {
  businessName,
  docDate,
  makeRng,
  personName,
  pick,
  pickInt,
  recentDate,
  tripRoute,
  vehicleOf,
} from "./seedDemo";

// Demo world: 50+ agencies, 15–30 drivers each, 40+ riders with 5–32 trips.
// Runs once (guarded by driver count). Deterministic: seed 20260928.
// Dev-only; prod gets real data. Mirrors db/ table shapes, not migrations.

const SEED = 20260928;
const TARGET_AGENCIES = 52;
const TARGET_DRIVERS = 1100;
const TARGET_RIDERS = 45;

const ZONE_PRICING: Record<string, { base: number; perKm: number; perMin: number; minimum: number }> = {};

function zonePricing(db: DatabaseSync) {
  if (Object.keys(ZONE_PRICING).length > 0) return ZONE_PRICING;
  const rows = db.prepare("SELECT id, base_fare, per_km, per_min, minimum FROM zones").all() as Record<string, unknown>[];
  for (const z of rows) {
    ZONE_PRICING[String(z.id)] = {
      base: Number(z.base_fare),
      perKm: Number(z.per_km),
      perMin: Number(z.per_min),
      minimum: Number(z.minimum),
    };
  }
  return ZONE_PRICING;
}

function pad(n: number, w: number): string {
  return String(n).padStart(w, "0");
}

function credit(
  db: DatabaseSync,
  userId: string,
  type: string,
  amountCents: number,
  ref: string | null,
  actorId: string | null,
) {
  const bal = db.prepare("SELECT balance_cents AS b FROM wallets WHERE user_id = ?").get(userId) as
    | { b: number }
    | undefined;
  const before = bal?.b ?? 0;
  if (before + amountCents < 0) return false;
  const next = before + amountCents;
  db.prepare(
    "INSERT INTO wallet_transactions (id, user_id, type, amount_cents, ref, balance_after, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(`wtx-demo-${Date.now()}-${Math.floor(Math.random() * 1e6)}`, userId, type, amountCents, ref, next, actorId);
  db.prepare("INSERT OR IGNORE INTO wallets (user_id, balance_cents) VALUES (?, 0)").run(userId);
  db.prepare("UPDATE wallets SET balance_cents = ? WHERE user_id = ?").run(next, userId);
  return true;
}

export function seedDemoWorld(db: DatabaseSync) {
  // Never in tests or builds: slow + pollutes. Dev-server runtime only
  // (SEED_DEMO_FORCE=1 overrides for scratch-file verification).
  if (
    (process.env.VITEST || process.env.NEXT_PHASE === "phase-production-build") &&
    !process.env.SEED_DEMO_FORCE
  )
    return { seeded: false as const };
  const driverCount = (db.prepare("SELECT COUNT(*) AS n FROM drivers").get() as { n: number }).n;
  if (driverCount >= 500) return { seeded: false as const };
  const rng = makeRng(SEED);
  const t0 = Date.now();
  const stats = { agencies: 0, drivers: 0, riders: 0, trips: 0, settled: 0, skippedFunds: 0 };

  // --- agencies (top up to target; existing kept) ---
  const haveAgencies = (
    db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'agency'").get() as { n: number }
  ).n;
  const agencyIds: string[] = (
    db.prepare("SELECT id FROM users WHERE role = 'agency' ORDER BY id").all() as { id: string }[]
  ).map((r) => r.id);
  const needAg = Math.max(0, TARGET_AGENCIES - haveAgencies);
  const addUser = db.prepare(
    "INSERT OR IGNORE INTO users (id, name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, 'otp-only', ?)",
  );
  const addRole = db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role) VALUES (?, ?)");
  for (let i = 0; i < needAg; i++) {
    const n = haveAgencies + i + 1;
    const id = `ag-demo-${pad(n, 2)}`;
    const biz = businessName(rng);
    const phone = `+639173${pad(10000 + n, 6).slice(-6)}`;
    addUser.run(id, `${biz} Ops`, `agency${pad(n, 2)}@demo.hatod`, phone, "agency");
    addRole.run(id, "agency");
    db.prepare(
      "INSERT INTO agency_applications (id, user_id, business_name, contact_phone, status, decided_by, decided_at) VALUES (?, ?, ?, ?, 'approved', 'usr-admin', datetime('now'))",
    ).run(`app-demo-${pad(n, 2)}`, id, biz, phone);
    // onboarding: random ordered prefix of steps
    const steps = ["docs", "fleet", "payout", "briefing", "golive"];
    const done = pickInt(rng, 0, 5);
    for (let s = 0; s < done; s++) {
      db.prepare(
        "INSERT OR IGNORE INTO onboarding_steps (application_id, step, completed_by) VALUES (?, ?, 'usr-admin')",
      ).run(`app-demo-${pad(n, 2)}`, steps[s]);
    }
    agencyIds.push(id);
    stats.agencies++;
  }

  // --- drivers (top up to target, 15–30 per agency in rotation) ---
  const haveDrivers = driverCount;
  const needDrv = Math.max(0, TARGET_DRIVERS - haveDrivers);
  const addDriver = db.prepare(
    "INSERT INTO drivers (id, name, phone, vehicle_type, plate_no, status, pa_expiry, cpc_expiry, license_no, agency_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  const addLive = db.prepare("INSERT OR IGNORE INTO drivers_live (driver_id, lat, lng) VALUES (?, ?, ?)");
  const statuses = ["approved", "approved", "approved", "online", "online", "pending", "pending", "suspended"];
  let created = 0;
  let ai = 0;
  const perAgency = new Map<string, number>();
  while (created < needDrv) {
    const agencyId = agencyIds[ai % agencyIds.length];
    ai++;
    const got = perAgency.get(agencyId) ?? 0;
    if (got >= 30) continue;
    perAgency.set(agencyId, got + 1);
    const n = haveDrivers + created + 1;
    const id = `drv-demo-${pad(n, 4)}`;
    const phone = `+6391731${pad(n, 5).slice(-5)}`;
    const v = vehicleOf(rng);
    addDriver.run(
      id,
      personName(rng),
      phone,
      v,
      `${v === "moto" ? "MC" : v === "trike" ? "TR" : "GSC"}-${1000 + n}`,
      pick(rng, statuses),
      docDate(rng),
      docDate(rng),
      `L-D${pad(n, 4)}`,
      agencyId,
    );
    addLive.run(id, 6.1164 + (rng() - 0.5) * 0.1, 125.1712 + (rng() - 0.5) * 0.1);
    // every 3rd driver gets a login (rest demo the "Create login" flow)
    if (n % 3 === 0) {
      const uid = `usr-drv-demo-${pad(n, 4)}`;
      addUser.run(uid, `Driver ${pad(n, 4)}`, `${phone.replace(/\D/g, "")}@drivers.hatod`, phone, "driver");
      addRole.run(uid, "driver");
      db.prepare("UPDATE drivers SET user_id = ? WHERE id = ?").run(uid, id);
    }
    created++;
    stats.drivers++;
  }
  // sample agency gets a visible fleet top-up (first 22 demo drivers)
  const sampleFleet = db.prepare("SELECT id FROM drivers WHERE agency_user_id = 'usr-sample-ag'").all() as {
    id: string;
  }[];
  if (sampleFleet.length === 0) {
    const first = db.prepare("SELECT id FROM drivers WHERE id LIKE 'drv-demo-%' ORDER BY id LIMIT 22").all() as {
      id: string;
    }[];
    const mv = db.prepare("UPDATE drivers SET agency_user_id = 'usr-sample-ag' WHERE id = ?");
    for (const r of first) mv.run(r.id);
  }

  // --- riders (top up to target) + wallets funded ---
  const haveRiders = (db.prepare("SELECT COUNT(*) AS n FROM riders").get() as { n: number }).n;
  const needRdr = Math.max(0, TARGET_RIDERS - haveRiders);
  const riderIds: string[] = (
    db.prepare("SELECT id FROM riders ORDER BY id").all() as { id: string }[]
  ).map((r) => r.id);
  for (let i = 0; i < needRdr; i++) {
    const n = haveRiders + i + 1;
    const id = `rdr-demo-${pad(n, 2)}`;
    const phone = `+6391732${pad(n, 5).slice(-5)}`;
    const uid = `usr-rdr-demo-${pad(n, 2)}`;
    db.prepare("INSERT INTO riders (id, name, phone, status) VALUES (?, ?, ?, 'active')").run(
      id,
      personName(rng),
      phone,
    );
    addUser.run(uid, `Rider ${pad(n, 2)}`, `${phone.replace(/\D/g, "")}@riders.hatod`, phone, "rider");
    addRole.run(uid, "rider");
    db.prepare("UPDATE riders SET user_id = ? WHERE id = ?").run(uid, id);
    credit(db, uid, "topup", pickInt(rng, 1500, 3000) * 100, null, "usr-admin");
    riderIds.push(id);
    stats.riders++;
  }

  // --- trips: 5–32 per rider, settled where completed ---
  const pricing = zonePricing(db);
  const zoneIds = Object.keys(pricing);
  const allDrivers = (
    db.prepare("SELECT id FROM drivers").all() as { id: string }[]
  ).map((r) => r.id);
  const addTrip = db.prepare(
    "INSERT INTO trips (id, zone_id, rider_name, rider_id, driver_id, status, pickup, dropoff, distance_m, duration_s, fare_quote, payment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'cash', ?)",
  );
  const countTrips = db.prepare("SELECT COUNT(*) AS n FROM trips WHERE rider_id = ?");
  let tn = (db.prepare("SELECT COUNT(*) AS n FROM trips").get() as { n: number }).n;
  for (const riderId of riderIds) {
    const have = (countTrips.get(riderId) as { n: number }).n;
    const want = pickInt(rng, 5, 32);
    for (let k = have; k < want; k++) {
      tn++;
      const zid = pick(rng, zoneIds);
      const km = 1 + rng() * 14;
      const distM = Math.round(km * 1000);
      const durS = Math.round(km * 180 + rng() * 300);
      const fare = calculateFare({ distanceM: distM, durationS: durS, pricing: pricing[zid] });
      const r = rng();
      const route = tripRoute(rng);
      const rname = `Rider ${riderId}`;
      const created = recentDate(rng);
      if (r < 0.7) {
        const drv = pick(rng, allDrivers);
        const id = `trip-demo-${pad(tn, 4)}`;
        addTrip.run(id, zid, rname, riderId, drv, "COMPLETED", route.pickup, route.dropoff, distM, durS, fare, created);
        // settle inline (same math as settleTrip, without extra lookups)
        const commission = Math.round(fare * 100 * 0.15);
        const fareC = fare * 100;
        const riderUid = (
          db.prepare("SELECT user_id AS u FROM riders WHERE id = ?").get(riderId) as { u: string | null }
        ).u;
        const drvUid = (
          db.prepare("SELECT user_id AS u FROM drivers WHERE id = ?").get(drv) as { u: string | null }
        ).u;
        if (riderUid && drvUid) {
          const okR = credit(db, riderUid, "ride_debit", -fareC, id, null);
          if (okR) {
            credit(db, drvUid, "ride_credit", fareC - commission, id, null);
            stats.settled++;
          } else stats.skippedFunds++;
        }
      } else if (r < 0.78) {
        const drv = pick(rng, allDrivers);
        addTrip.run(`trip-demo-${pad(tn, 4)}`, zid, rname, riderId, drv, pick(rng, ["IN_PROGRESS", "ACCEPTED", "ARRIVED"]), route.pickup, route.dropoff, distM, durS, fare, created);
      } else if (r < 0.88) {
        addTrip.run(`trip-demo-${pad(tn, 4)}`, zid, rname, riderId, null, "SEARCHING", route.pickup, route.dropoff, distM, durS, fare, created);
      } else {
        const drv = pick(rng, allDrivers);
        addTrip.run(`trip-demo-${pad(tn, 4)}`, zid, rname, riderId, drv, "CANCELLED", route.pickup, route.dropoff, distM, durS, fare, created);
      }
      stats.trips++;
    }
  }

  console.log(
    `[hatod demo-seed] +${stats.agencies} agencies, +${stats.drivers} drivers, +${stats.riders} riders, +${stats.trips} trips (${stats.settled} settled) in ${Date.now() - t0}ms`,
  );
  return { seeded: true as const, ...stats };
}
