import { canGoOnline } from "./compliance";
import { normalizePhPhone } from "./phone";
import { agencyDisplayName, canOffboard, validateDriver } from "./driverRules";
import { insertQuery } from "./repo";
import { paginate } from "./users";
import { queryDb } from "./db";
import type { Driver, DriverStatus, VehicleType } from "./types";

export {
  DEFAULT_AGENCY_ID,
  agencyDisplayName,
  canManageDriver,
  canOffboard,
  filterDrivers,
  validateDriver,
  type NewDriver,
} from "./driverRules";

const GENSAN = { lat: 6.1164, lng: 125.1712 };

function rowToDriver(row: Record<string, unknown>): Driver {
  return {
    id: String(row.id),
    name: String(row.name),
    phone: String(row.phone),
    vehicleType: String(row.vehicle_type) as VehicleType,
    plateNo: String(row.plate_no),
    status: String(row.status) as DriverStatus,
    docs: {
      paExpiry: String(row.pa_expiry).slice(0, 10),
      cpcExpiry: String(row.cpc_expiry).slice(0, 10),
      licenseNo: String(row.license_no),
    },
    lat: Number(row.lat ?? GENSAN.lat),
    lng: Number(row.lng ?? GENSAN.lng),
    updatedAt: new Date(row.updated_at as string).toISOString(),
    agencyUserId: (row.agency_user_id as string) ?? null,
    userId: (row.user_id as string) ?? null,
    agencyName: row.agency_name == null ? null : String(row.agency_name),
  };
}

const DRIVER_COLS = `d.id, d.name, d.phone, d.vehicle_type, d.plate_no, d.status,
  d.pa_expiry, d.cpc_expiry, d.license_no, d.agency_user_id, d.user_id, d.updated_at,
  l.lat, l.lng, u.name AS agency_name`;
const DRIVER_FROM = `drivers d LEFT JOIN drivers_live l ON l.driver_id = d.id
  LEFT JOIN users u ON u.id = d.agency_user_id`;

export async function listDrivers(filter?: { agencyUserId?: string }): Promise<Driver[]> {
  const rows =
    filter?.agencyUserId !== undefined
      ? await queryDb<Record<string, unknown>>(
          `SELECT ${DRIVER_COLS} FROM ${DRIVER_FROM} WHERE d.agency_user_id = $1 ORDER BY d.updated_at DESC`,
          [filter.agencyUserId],
        )
      : await queryDb<Record<string, unknown>>(
          `SELECT ${DRIVER_COLS} FROM ${DRIVER_FROM} ORDER BY d.updated_at DESC`,
          [],
        );
  return rows.map(rowToDriver);
}

export interface DriverPage {
  rows: Driver[];
  total: number;
  page: number;
  pages: number;
}

const DRIVER_PER_PAGE = 10;

/** Ops board: DB search (name/phone/plate/status) + pagination, one value per slot. */
export async function listDriversPaged(q = "", page = 1): Promise<DriverPage> {
  const needle = q.trim();
  const like = `%${needle}%`;
  const where = `WHERE ($1 = '' OR d.name LIKE $2 OR d.phone LIKE $3 OR d.plate_no LIKE $4 OR d.status LIKE $5 OR d.vehicle_type LIKE $6)`;
  const params = [needle, like, like, like, like, like];
  const totalRows = await queryDb<{ n: number }>(
    `SELECT COUNT(*) AS n FROM drivers d ${where}`,
    params as unknown[],
  );
  const total = Number(totalRows[0]?.n ?? 0);
  const { page: safe, pages, offset, limit } = paginate(total, page, DRIVER_PER_PAGE);
  const rows = await queryDb<Record<string, unknown>>(
    `SELECT ${DRIVER_COLS} FROM ${DRIVER_FROM} ${where}
     ORDER BY d.updated_at DESC LIMIT ${limit} OFFSET ${offset}`,
    params as unknown[],
  );
  return { rows: rows.map(rowToDriver), total, page: safe, pages };
}

export async function getDriver(id: string): Promise<Driver | null> {
  const rows = await queryDb<Record<string, unknown>>(
    `SELECT ${DRIVER_COLS} FROM ${DRIVER_FROM} WHERE d.id = $1`,
    [id],
  );
  return rows.length > 0 ? rowToDriver(rows[0]) : null;
}

/** Driver's own profile, resolved from their login account. */
export async function getDriverByUser(userId: string): Promise<Driver | null> {
  const rows = await queryDb<Record<string, unknown>>(
    `SELECT ${DRIVER_COLS} FROM ${DRIVER_FROM} WHERE d.user_id = $1`,
    [userId],
  );
  return rows.length > 0 ? rowToDriver(rows[0]) : null;
}

export interface DriverAgency {
  agencyUserId: string;
  displayName: string;
}

/** The agency a driver belongs to (account name, business name when approved). */
export async function getDriverAgency(driverId: string): Promise<DriverAgency | null> {
  const rows = await queryDb<Record<string, unknown>>(
    `SELECT d.agency_user_id, u.name AS agency_name, a.business_name FROM drivers d
     LEFT JOIN users u ON u.id = d.agency_user_id
     LEFT JOIN agency_applications a ON a.user_id = d.agency_user_id AND a.status = 'approved'
     WHERE d.id = $1`,
    [driverId],
  );
  const row = rows[0];
  if (!row || row.agency_user_id == null) return null;
  return {
    agencyUserId: String(row.agency_user_id),
    displayName: agencyDisplayName(String(row.agency_name ?? "?"), row.business_name == null ? null : String(row.business_name)),
  };
}

/** Onboard a driver — always under an agency (default agency for direct ops intake). */
export async function createDriver(
  input: unknown,
  agencyUserId: string | null,
): Promise<Driver> {
  if (!agencyUserId) throw new Error("driver requires an agency — use the default agency for direct intake");
  const clean = validateDriver(input);
  const id = `drv-${Date.now()}`;
  const q = insertQuery(
    "drivers",
    ["id", "name", "phone", "vehicle_type", "plate_no", "status", "pa_expiry", "cpc_expiry", "license_no", "agency_user_id"],
    {
      id,
      name: clean.name,
      phone: clean.phone,
      vehicle_type: clean.vehicleType,
      plate_no: clean.plateNo,
      status: "pending",
      pa_expiry: clean.paExpiry,
      cpc_expiry: clean.cpcExpiry,
      license_no: clean.licenseNo,
      agency_user_id: agencyUserId,
    },
  );
  await queryDb(q.text, q.values);
  const lq = insertQuery("drivers_live", ["driver_id", "lat", "lng"], {
    driver_id: id,
    lat: GENSAN.lat,
    lng: GENSAN.lng,
  });
  await queryDb(lq.text, lq.values);
  const created = await getDriver(id);
  if (!created) throw new Error("driver insert failed");
  return created;
}

export interface DriverLogin {
  userId: string;
  email: string;
}

/**
 * Create a login for an onboarded driver (OTP sign-in on their number).
 * Email optional — defaults to a phone-derived login. Idempotent-safe:
 * refuses when a login already exists.
 */
export async function createDriverLogin(
  driverId: string,
  email?: string,
): Promise<DriverLogin> {
  const d = await getDriver(driverId);
  if (!d) throw new Error("driver not found");
  if (d.userId) throw new Error("driver already has a login");
  const digits = d.phone.replace(/\D/g, "");
  const loginEmail = (email ?? `${digits}@drivers.hatod`).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) throw new Error("invalid email");
  const userId = `usr-${Date.now()}`;
  const uq = insertQuery(
    "users",
    ["id", "name", "email", "phone", "password_hash", "role"],
    {
      id: userId,
      name: d.name,
      email: loginEmail,
      phone: normalizePhPhone(d.phone),
      password_hash: "otp-only",
      role: "driver",
    },
  );
  await queryDb(uq.text, uq.values);
  const rq = insertQuery("user_roles", ["user_id", "role"], { user_id: userId, role: "driver" });
  await queryDb(rq.text, rq.values);
  await queryDb("UPDATE drivers SET user_id = $1 WHERE id = $2", [userId, driverId]);
  return { userId, email: loginEmail };
}

/** Status change with the LTFRB compliance gate on going online. */
export async function setDriverStatus(id: string, status: DriverStatus): Promise<Driver> {
  const current = await getDriver(id);
  if (!current) throw new Error("driver not found");
  if (status === "online") {
    const gate = canGoOnline(current);
    if (!gate.ok) throw new Error(gate.reason ?? "not compliant");
  }
  await queryDb("UPDATE drivers SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [
    status,
    id,
  ]);
  const updated = await getDriver(id);
  if (!updated) throw new Error("driver not found");
  return updated;
}

/** Edit profile details — full-record validation (merge existing + patch upstream). */
export async function updateDriver(id: string, patch: unknown): Promise<Driver> {
  const current = await getDriver(id);
  if (!current) throw new Error("driver not found");
  const clean = validateDriver({
    name: current.name,
    phone: current.phone,
    vehicleType: current.vehicleType,
    plateNo: current.plateNo,
    paExpiry: current.docs.paExpiry,
    cpcExpiry: current.docs.cpcExpiry,
    licenseNo: current.docs.licenseNo,
    ...(patch as Record<string, unknown>),
  });
  await queryDb(
    `UPDATE drivers SET name = $1, phone = $2, vehicle_type = $3, plate_no = $4,
     pa_expiry = $5, cpc_expiry = $6, license_no = $7, updated_at = CURRENT_TIMESTAMP
     WHERE id = $8`,
    [
      clean.name,
      clean.phone,
      clean.vehicleType,
      clean.plateNo,
      clean.paExpiry,
      clean.cpcExpiry,
      clean.licenseNo,
      id,
    ],
  );
  const updated = await getDriver(id);
  if (!updated) throw new Error("driver not found");
  return updated;
}

/** Remove a driver with zero trips (docs, live pin, profile). History blocks. */
export async function offboardDriver(id: string): Promise<void> {
  const trips = await queryDb<Record<string, unknown>>(
    "SELECT id FROM trips WHERE driver_id = $1 LIMIT 1",
    [id],
  );
  const gate = canOffboard(trips.length);
  if (!gate.ok) throw new Error(gate.reason ?? "cannot offboard");
  await queryDb("DELETE FROM driver_documents WHERE driver_id = $1", [id]);
  await queryDb("DELETE FROM drivers_live WHERE driver_id = $1", [id]);
  await queryDb("DELETE FROM drivers WHERE id = $1", [id]);
}
