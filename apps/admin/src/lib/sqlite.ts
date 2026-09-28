import { DatabaseSync } from "node:sqlite";
import { hashPasswordSync } from "./auth";
import { drivers, riders, zones } from "./seed";

// Dev-only database. Prod runs Postgres (db/migrations/*.sql).
// Geography columns become plain lat/lng here; distance math falls back to geo.ts.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS zones (
  id TEXT PRIMARY KEY, name TEXT NOT NULL,
  base_fare INTEGER NOT NULL, per_km INTEGER NOT NULL,
  per_min REAL NOT NULL, minimum INTEGER NOT NULL,
  cash_enabled INTEGER NOT NULL DEFAULT 1, gcash_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL UNIQUE,
  vehicle_type TEXT NOT NULL, plate_no TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  pa_expiry TEXT NOT NULL, cpc_expiry TEXT NOT NULL, license_no TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS drivers_live (
  driver_id TEXT PRIMARY KEY REFERENCES drivers(id) ON DELETE CASCADE,
  lat REAL NOT NULL, lng REAL NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY, zone_id TEXT NOT NULL REFERENCES zones(id),
  rider_name TEXT NOT NULL, rider_id TEXT REFERENCES riders(id),
  driver_id TEXT REFERENCES drivers(id),
  status TEXT NOT NULL DEFAULT 'SEARCHING',
  pickup TEXT NOT NULL, dropoff TEXT NOT NULL,
  distance_m INTEGER NOT NULL, duration_s INTEGER NOT NULL,
  fare_quote INTEGER NOT NULL, payment TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS riders (
  id TEXT PRIMARY KEY, name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE CHECK (phone <> ''),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operations',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);`;

let _db: DatabaseSync | null = null;

function seedIfEmpty(db: DatabaseSync) {
  const count = (t: string) =>
    (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;
  if (count("zones") === 0) {
    const ins = db.prepare(
      "INSERT INTO zones (id, name, base_fare, per_km, per_min, minimum, cash_enabled, gcash_enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    );
    for (const z of zones)
      ins.run(
        z.id,
        z.name,
        z.pricing.base,
        z.pricing.perKm,
        z.pricing.perMin,
        z.pricing.minimum,
        z.cashEnabled ? 1 : 0,
        z.gcashEnabled ? 1 : 0,
      );
  }
  if (count("riders") === 0) {
    const ins = db.prepare("INSERT INTO riders (id, name, phone, status) VALUES (?, ?, ?, ?)");
    for (const r of riders) ins.run(r.id, r.name, r.phone || `pending-${r.id}`, r.status);
  }
  if (count("users") === 0) {
    // Dev-only bootstrap admin. Prod users come from migration 003 + server-side insert.
    const password = process.env.ADMIN_PASSWORD ?? "Hatod123!";
    if (!process.env.ADMIN_PASSWORD)
      console.warn("[hatod] seeding dev admin admin@hatod.co / Hatod123! — set ADMIN_PASSWORD to override");
    db.prepare("INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)").run(
      "usr-admin",
      "Ops Admin",
      "admin@hatod.co",
      hashPasswordSync(password),
      "superadmin",
    );
  }
  if (count("drivers") === 0) {    const ins = db.prepare(
      "INSERT INTO drivers (id, name, phone, vehicle_type, plate_no, status, pa_expiry, cpc_expiry, license_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    );
    const live = db.prepare("INSERT INTO drivers_live (driver_id, lat, lng) VALUES (?, ?, ?)");
    for (const d of drivers) {
      ins.run(
        d.id,
        d.name,
        d.phone,
        d.vehicleType,
        d.plateNo,
        d.status,
        d.docs.paExpiry,
        d.docs.cpcExpiry,
        d.docs.licenseNo,
      );
      live.run(d.id, d.lat, d.lng);
    }
  }
}

export function getDevDb(): DatabaseSync {
  if (!_db) {
    _db = new DatabaseSync(process.env.SQLITE_PATH ?? "dev.sqlite3");
    _db.exec(SCHEMA);
    seedIfEmpty(_db);
  }
  return _db;
}
