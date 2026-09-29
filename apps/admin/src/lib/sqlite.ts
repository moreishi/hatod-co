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
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  agency_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
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
  paid INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS riders (
  id TEXT PRIMARY KEY, name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE CHECK (phone <> ''),
  email TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operations', phone TEXT UNIQUE,
  active INTEGER NOT NULL DEFAULT 1, last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  granted_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, role)
);
CREATE TABLE IF NOT EXISTS agency_applications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL, contact_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  decided_by TEXT REFERENCES users(id), decided_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS role_grants (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  granted INTEGER NOT NULL,
  actor_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS role_grants_user_idx ON role_grants (user_id);
CREATE TABLE IF NOT EXISTS onboarding_steps (
  application_id TEXT NOT NULL REFERENCES agency_applications(id) ON DELETE CASCADE,
  step TEXT NOT NULL,
  completed_by TEXT REFERENCES users(id),
  completed_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (application_id, step)
);
CREATE TABLE IF NOT EXISTS driver_documents (
  id TEXT PRIMARY KEY,
  driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  file_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  expiry_date TEXT,
  verified_by TEXT REFERENCES users(id),
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS driver_documents_driver_idx ON driver_documents (driver_id, type);
CREATE TABLE IF NOT EXISTS payouts (
  id TEXT PRIMARY KEY,
  agency_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start TEXT NOT NULL, period_end TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'paid',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS payouts_agency_idx ON payouts (agency_user_id);
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'paymongo',
  amount INTEGER NOT NULL, fee INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  checkout_id TEXT, reference TEXT,
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS payments_trip_idx ON payments (trip_id);
CREATE TABLE IF NOT EXISTS wallets (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance_cents INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  ref TEXT,
  memo TEXT,
  balance_after INTEGER NOT NULL,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS wallet_tx_user_idx ON wallet_transactions (user_id);
CREATE INDEX IF NOT EXISTS wallet_tx_ref_idx ON wallet_transactions (ref);
CREATE TABLE IF NOT EXISTS otp_codes (
  phone TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  requested_at TEXT NOT NULL DEFAULT (datetime('now'))
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
    db.prepare("INSERT INTO users (id, name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)").run(
      "usr-admin",
      "Ops Admin",
      "admin@hatod.co",
      "+639170000001",
      hashPasswordSync(password),
      "superadmin",
    );
    db.prepare("INSERT INTO user_roles (user_id, role) VALUES (?, ?)").run(
      "usr-admin",
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
  if (count("trips") === 0) {
    // Demo dispatch pool: two open offers in downtown Gensan.
    const ins = db.prepare(
      "INSERT INTO trips (id, zone_id, rider_name, driver_id, status, pickup, dropoff, distance_m, duration_s, fare_quote, payment) VALUES (?, ?, ?, NULL, 'SEARCHING', ?, ?, ?, ?, ?, ?)",
    );
    ins.run("trip-demo-1", "gensan-downtown", "Demo Rider", "SM Gensan", "Lagao Public Market", 4200, 720, 114, "cash");
    ins.run("trip-demo-2", "gensan-airport", "Demo Flyer", "Gensan Airport", "Downtown", 9800, 1200, 247, "cash");
  }
  seedSampleLogins(db);
}

/**
 * Dev-only sample logins, one per role (password: Hatod123!).
 * Idempotent (INSERT OR IGNORE) so existing files gain them on next boot.
 * NEVER mirrored to db/migrations — prod accounts are created server-side.
 */
function seedSampleLogins(db: DatabaseSync) {
  const samples: [string, string, string, string, string][] = [
    ["usr-sample-ops", "Sam Ops", "ops@hatod.co", "+639170000011", "operations"],
    ["usr-sample-fin", "Fay Finance", "finance@hatod.co", "+639170000022", "finance"],
    ["usr-sample-sup", "Sid Support", "support@hatod.co", "+639170000033", "support"],
    ["usr-sample-ag", "Aya Agency", "agency@hatod.co", "+639170000044", "agency"],
    ["usr-sample-drv", "Dan Driver", "driver@hatod.co", "+639171110001", "driver"],
    ["usr-sample-rdr", "Ria Rider", "rider@hatod.co", "+639171110011", "rider"],
  ];
  const hash = hashPasswordSync("Hatod123!");
  const addUser = db.prepare(
    "INSERT OR IGNORE INTO users (id, name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const addRole = db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role) VALUES (?, ?)");
  for (const [id, name, email, phone, role] of samples) {
    addUser.run(id, name, email, phone, hash, role);
    addRole.run(id, role);
  }
  // Backfill phones for rows created before the OTP swap (dev convenience).
  const backfill: [string, string][] = [
    ["admin@hatod.co", "+639170000001"],
    ["ops@hatod.co", "+639170000011"],
    ["finance@hatod.co", "+639170000022"],
    ["support@hatod.co", "+639170000033"],
    ["agency@hatod.co", "+639170000044"],
    ["driver@hatod.co", "+639171110001"],
    ["rider@hatod.co", "+639171110011"],
  ];
  const fix = db.prepare("UPDATE users SET phone = ? WHERE email = ? AND phone IS NULL");
  for (const [email, phone] of backfill) fix.run(phone, email);
  // Link one profile each so the Account column + driver login demo out of the box.
  db.prepare("UPDATE riders SET user_id = ? WHERE id = ? AND user_id IS NULL").run(
    "usr-sample-rdr",
    "rdr-001",
  );
  db.prepare("UPDATE drivers SET user_id = ? WHERE id = ? AND user_id IS NULL").run(
    "usr-sample-drv",
    "drv-001",
  );
}

/** Additive-only dev migrations for existing local files (mirrors db/migrations). */
function migrate(db: DatabaseSync) {
  const ensure = (table: string, column: string, ddl: string) => {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!cols.some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  };
  ensure("riders", "user_id", "user_id TEXT REFERENCES users(id) ON DELETE SET NULL");
  ensure("users", "active", "active INTEGER NOT NULL DEFAULT 1");
  ensure("users", "last_login_at", "last_login_at TEXT");
  ensure("riders", "email", "email TEXT");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS riders_email_uidx ON riders(email)");
  ensure("drivers", "user_id", "user_id TEXT REFERENCES users(id) ON DELETE SET NULL");
  ensure("drivers", "agency_user_id", "agency_user_id TEXT REFERENCES users(id) ON DELETE SET NULL");
  ensure("trips", "paid", "paid INTEGER NOT NULL DEFAULT 0");
  // UNIQUE can't ride along ADD COLUMN on a populated table — index it after.
  ensure("users", "phone", "phone TEXT");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS users_phone_uidx ON users(phone)");
  ensure("wallet_transactions", "memo", "memo TEXT");
  // 006 backfill: every account keeps its legacy role as a granted profile.
  db.exec(`INSERT INTO user_roles (user_id, role)
    SELECT id, role FROM users
    WHERE NOT EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = users.id AND user_roles.role = users.role)`);
  // 020 backfill: orphans belong to the Hatod Direct system agency.
  db.prepare(
    "INSERT OR IGNORE INTO users (id, name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)",
  ).run("usr-agency-default", "Hatod Direct", "direct@hatod.co", "+639000000000", "otp-only", "agency");
  db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role) VALUES (?, ?)").run(
    "usr-agency-default",
    "agency",
  );
  db.prepare("UPDATE drivers SET agency_user_id = ? WHERE agency_user_id IS NULL").run(
    "usr-agency-default",
  );
}

export function getDevDb(): DatabaseSync {
  if (!_db) {
    _db = new DatabaseSync(process.env.SQLITE_PATH ?? "dev.sqlite3");
    _db.exec(SCHEMA);
    migrate(_db);
    seedIfEmpty(_db);
  }
  return _db;
}
