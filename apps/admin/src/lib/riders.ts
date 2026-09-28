import { deleteQuery, insertQuery, isUniqueViolation, updateQuery } from "./repo";
import { hasDb, queryDb } from "./db";
import type { Rider, RiderStatus } from "./types";

const COLS = ["id", "name", "phone", "email", "status"];

export interface NewRider {
  name: string;
  phone: string;
  email?: string | null;
}

export function validateRider(input: NewRider): NewRider {
  const name = input.name.trim();
  const phone = input.phone.trim();
  if (!name) throw new Error("name is required");
  if (!phone) throw new Error("phone is required");
  return { name, phone };
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
  const q = deleteQuery("riders", id);
  await queryDb(q.text, q.values);
}
