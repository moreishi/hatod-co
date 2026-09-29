import { deleteQuery, insertQuery, isUniqueViolation, updateQuery } from "./repo";
import { canOffboard } from "./driverRules";
import { normalizePhPhone } from "./phone";
import { paginate } from "./users";
import { hasDb, queryDb } from "./db";
import type { Rider, RiderStatus } from "./types";

const COLS = ["id", "name", "phone", "email", "status"];

export interface NewRider {
  name: string;
  phone: string;
  email?: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Identity rules: phone always required + unique (DB); email optional but
 * unique when present — empty string coerces to NULL so many riders can
 * have "no email" without colliding.
 */
export function validateRiderInput(input: {
  name: string;
  phone: string;
  email?: string | null;
}): { name: string; phone: string; email: string | null } {
  const name = input.name.trim();
  if (!name) throw new Error("name is required");
  const phone = input.phone.trim();
  if (!phone) throw new Error("phone is required");
  const rawEmail = (input.email ?? "").trim().toLowerCase();
  if (rawEmail && !EMAIL_RE.test(rawEmail)) throw new Error("invalid email");
  return { name, phone, email: rawEmail || null };
}

function rowToRider(row: Record<string, unknown>): Rider {
  return {
    id: String(row.id),
    name: String(row.name),
    phone: String(row.phone),
    email: row.email == null ? null : String(row.email),
    status: row.status as RiderStatus,
    createdAt: new Date(row.created_at as string).toISOString(),
    account:
      row.account_email == null
        ? null
        : { email: String(row.account_email), role: String(row.account_role) },
  };
}

/** List riders — Postgres when DATABASE_URL is set, else local dev SQLite. */
export async function listRiders(): Promise<{ riders: Rider[]; live: boolean }> {
  const rows = await queryDb<Record<string, unknown>>(
    `SELECT r.*, u.email AS account_email, u.role AS account_role
     FROM riders r LEFT JOIN users u ON u.id = r.user_id
     ORDER BY r.created_at DESC`,
    [],
  );
  return { riders: rows.map(rowToRider), live: hasDb() };
}

export interface RiderPage {
  rows: Rider[];
  total: number;
  page: number;
  pages: number;
}

const RIDER_PER_PAGE = 10;

/** Riders board: DB search (name/email/phone) + pagination (one value per slot). */
export async function listRidersPaged(q = "", page = 1): Promise<RiderPage> {
  const needle = q.trim();
  let digits = "";
  try {
    digits = normalizePhPhone(needle);
  } catch {
    digits = needle.replace(/\D/g, "");
  }
  const like = `%${needle}%`;
  const d1 = `%${digits}%`;
  const d2 = `%${digits.replace(/^63/, "0")}%`;
  const where = `WHERE ($1 = '' OR r.name LIKE $2 OR r.email LIKE $3 OR r.phone LIKE $4 OR r.phone LIKE $5 OR r.phone LIKE $6)`;
  const params = [needle, like, like, like, d1, d2];
  const totalRows = await queryDb<{ n: number }>(
    `SELECT COUNT(*) AS n FROM riders r ${where}`,
    params as unknown[],
  );
  const total = Number(totalRows[0]?.n ?? 0);
  const { page: safe, pages, offset, limit } = paginate(total, page, RIDER_PER_PAGE);
  const rows = await queryDb<Record<string, unknown>>(
    `SELECT r.*, u.email AS account_email, u.role AS account_role
     FROM riders r LEFT JOIN users u ON u.id = r.user_id ${where}
     ORDER BY r.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    params as unknown[],
  );
  return { rows: rows.map(rowToRider), total, page: safe, pages };
}

export async function createRider(input: NewRider): Promise<Rider> {
  const clean = validateRiderInput(input);
  const q = insertQuery("riders", COLS, {
    id: `rdr-${Date.now()}`,
    ...clean,
    status: "active",
  });
  try {
    const rows = await queryDb<Record<string, unknown>>(q.text, q.values);
    return rowToRider(rows[0]);
  } catch (err) {
    if (isUniqueViolation(err)) {
      const msg = String((err as { message?: string }).message ?? "");
      throw new Error(/email/i.test(msg) ? "email already registered" : "phone already registered");
    }
    throw err;
  }
}

export async function setRiderStatus(id: string, status: RiderStatus): Promise<Rider> {
  if (status !== "active" && status !== "suspended") throw new Error("bad status");
  const q = updateQuery("riders", ["status"], id, { status });
  const rows = await queryDb<Record<string, unknown>>(q.text, q.values);
  return rowToRider(rows[0]);
}

export async function deleteRider(id: string): Promise<void> {
  const trips = await queryDb("SELECT id FROM trips WHERE rider_id = $1 LIMIT 1", [id]);
  const gate = canOffboard(trips.length);
  if (!gate.ok) throw new Error(gate.reason ?? "cannot delete");
  const q = deleteQuery("riders", id);
  await queryDb(q.text, q.values);
}

/** Rider's own profile, resolved from their login account. */
export async function getRiderByUser(userId: string): Promise<Rider | null> {
  const rows = await queryDb<Record<string, unknown>>(
    `SELECT r.*, u.email AS account_email, u.role AS account_role
     FROM riders r LEFT JOIN users u ON u.id = r.user_id
     WHERE r.user_id = $1`,
    [userId],
  );
  return rows.length > 0 ? rowToRider(rows[0]) : null;
}
