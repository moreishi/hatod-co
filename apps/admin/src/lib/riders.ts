import { deleteQuery, insertQuery, updateQuery } from "./repo";
import { hasDb, queryDb } from "./db";
import type { Rider, RiderStatus } from "./types";

const COLS = ["id", "name", "phone", "status"];

export interface NewRider {
  name: string;
  phone: string;
}

export function validateRider(input: NewRider): NewRider {
  const name = input.name.trim();
  const phone = input.phone.trim();
  if (!name) throw new Error("name is required");
  if (!phone) throw new Error("phone is required");
  return { name, phone };
}

function rowToRider(row: Record<string, unknown>): Rider {
  return {
    id: String(row.id),
    name: String(row.name),
    phone: String(row.phone),
    status: row.status as RiderStatus,
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

/** List riders — Postgres when DATABASE_URL is set, else local dev SQLite. */
export async function listRiders(): Promise<{ riders: Rider[]; live: boolean }> {
  const rows = await queryDb<Record<string, unknown>>(
    "SELECT * FROM riders ORDER BY created_at DESC",
    [],
  );
  return { riders: rows.map(rowToRider), live: hasDb() };
}

export async function createRider(input: NewRider): Promise<Rider> {
  const clean = validateRider(input);
  const q = insertQuery("riders", COLS, {
    id: `rdr-${Date.now()}`,
    ...clean,
    status: "active",
  });
  const rows = await queryDb<Record<string, unknown>>(q.text, q.values);
  return rowToRider(rows[0]);
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
