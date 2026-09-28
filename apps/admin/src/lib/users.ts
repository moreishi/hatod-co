import { z } from "zod";
import { deleteQuery, insertQuery } from "./repo";
import { normalizePhPhone } from "./phone";
import { ROLES, type Role } from "./access";
import { hasDb, queryDb } from "./db";

export const UserSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  email: z.string().trim().toLowerCase().email("invalid email"),
  phone: z.string().trim().min(1, "phone is required"),
  role: z.enum(ROLES as [Role, ...Role[]]),
});

export type NewUser = z.infer<typeof UserSchema>;

export function validateUser(input: unknown): NewUser {
  try {
    const parsed = UserSchema.parse(input);
    let phone: string;
    try {
      phone = normalizePhPhone(parsed.phone);
    } catch {
      throw new Error("phone: invalid PH mobile number");
    }
    return { ...parsed, phone };
  } catch (e) {
    if (e instanceof z.ZodError) {
      const first = e.issues[0];
      throw new Error(`${String(first.path[0] ?? "input")}: ${first.message}`);
    }
    throw e;
  }
}

/** A user holds a non-empty set of profiles (rider + driver at once). */
export function parseRoles(input: unknown): Role[] {
  if (!Array.isArray(input) || input.length === 0) throw new Error("at least one role is required");
  const roles = input as string[];
  for (const r of roles) {
    if (!ROLES.includes(r as Role)) throw new Error(`unknown role: ${r}`);
  }
  return [...new Set(roles)] as Role[];
}

/** Role dropdown filter: empty keeps every role set. */
export function filterByRole<T extends { roles: Role[] }>(rows: T[], role: string): T[] {
  if (!role) return rows;
  if (!ROLES.includes(role as Role)) return [];
  return rows.filter((r) => r.roles.includes(role as Role));
}

export interface TeamUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  roles: Role[];
  createdAt: string;
}

/** Wallet search across name, email, and unique phone (any format). */
export function filterUsers<T extends { name: string; email: string; phone?: string | null }>(
  rows: T[],
  q: string,
): T[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return rows;
  let digits = "";
  try {
    digits = normalizePhPhone(needle);
  } catch {
    digits = needle.replace(/\D/g, "");
  }
  return rows.filter((r) => {
    const hay = `${r.name} ${r.email} ${r.phone ?? ""}`.toLowerCase();
    if (hay.includes(needle)) return true;
    if (!digits) return false;
    const rowDigits = (r.phone ?? "").replace(/\D/g, "");
    return rowDigits.includes(digits.replace(/\D/g, "")) && digits.replace(/\D/g, "").length >= 4;
  });
}

export interface Page {
  page: number;
  pages: number;
  offset: number;
  limit: number;
}

/** DB-level pagination math: clamps, always ≥1 page. */
export function paginate(total: number, page: number, perPage: number): Page {
  const limit = Math.max(1, perPage);
  const pages = Math.max(1, Math.ceil(total / limit));
  const safe = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  return { page: safe, pages, offset: (safe - 1) * limit, limit };
}

const COLS = ["id", "name", "email", "phone", "password_hash", "role"];

function rowToUser(row: Record<string, unknown>): TeamUser {
  const legacy = row.legacy as Role;
  const raw = row.roles;
  const set = new Set<Role>();
  if (typeof raw === "string" && raw)
    for (const r of raw.split(",")) if (ROLES.includes(r as Role)) set.add(r as Role);
  else if (Array.isArray(raw))
    for (const r of raw) if (ROLES.includes(r as Role)) set.add(r as Role);
  if (ROLES.includes(legacy)) set.add(legacy);
  const roles = [...set];
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    phone: row.phone == null ? null : String(row.phone),
    role: roles.includes("superadmin") ? "superadmin" : (roles[0] ?? legacy),
    roles,
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

const USER_LIST_PG = `SELECT u.id, u.name, u.email, u.phone, u.role AS legacy, u.created_at,
  COALESCE(array_agg(ur.role) FILTER (WHERE ur.role IS NOT NULL), '{}') AS roles
  FROM users u LEFT JOIN user_roles ur ON ur.user_id = u.id
  GROUP BY u.id, u.name, u.email, u.phone, u.role, u.created_at ORDER BY u.created_at ASC`;
const USER_LIST_SQLITE = `SELECT u.id, u.name, u.email, u.phone, u.role AS legacy, u.created_at,
  group_concat(ur.role) AS roles
  FROM users u LEFT JOIN user_roles ur ON ur.user_id = u.id
  GROUP BY u.id ORDER BY u.created_at ASC`;

export async function listUsers(): Promise<TeamUser[]> {
  const rows = await queryDb<Record<string, unknown>>(
    hasDb() ? USER_LIST_PG : USER_LIST_SQLITE,
    [],
  );
  return rows.map(rowToUser);
}

export interface UserPage {
  rows: TeamUser[];
  total: number;
  page: number;
  pages: number;
}

const PER_PAGE = 10;

/** Admin users board: DB search + role filter + pagination (one value per slot). */
export async function listUsersPaged(
  q = "",
  role = "",
  page = 1,
): Promise<UserPage> {
  const needle = q.trim();
  let digits = "";
  try {
    digits = normalizePhPhone(needle);
  } catch {
    digits = needle.replace(/\D/g, "");
  }
  const cleanRole = ROLES.includes(role as Role) ? role : "";
  const like = `%${needle}%`;
  const d1 = `%${digits}%`;
  const d2 = `%${digits.replace(/^63/, "0")}%`;
  // NOTE: one value per slot on both dialects ($n reused would need repeats in SQLite).
  const where = `WHERE ($1 = '' OR u.name LIKE $2 OR u.email LIKE $3 OR u.phone LIKE $4 OR u.phone LIKE $5 OR u.phone LIKE $6)
    AND ($7 = '' OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role = $8))`;
  const params = [needle, like, like, like, d1, d2, cleanRole, cleanRole];
  const agg = hasDb()
    ? `COALESCE(array_agg(urr.role) FILTER (WHERE urr.role IS NOT NULL), '{}')`
    : `group_concat(urr.role)`;
  const totalRows = await queryDb<{ n: number }>(
    `SELECT COUNT(*) AS n FROM users u ${where}`,
    params as unknown[],
  );
  const total = Number(totalRows[0]?.n ?? 0);
  const { page: safe, pages, offset, limit } = paginate(total, page, PER_PAGE);
  const rows = await queryDb<Record<string, unknown>>(
    `SELECT u.id, u.name, u.email, u.phone, u.role AS legacy, u.created_at, ${agg} AS roles
     FROM users u LEFT JOIN user_roles urr ON urr.user_id = u.id ${where}
     GROUP BY u.id, u.name, u.email, u.phone, u.role, u.created_at ORDER BY u.created_at ASC LIMIT ${limit} OFFSET ${offset}`,
    params as unknown[],
  );
  return { rows: rows.map(rowToUser), total, page: safe, pages };
}

/** Single profile with roles for the detail page. */
export async function getUserById(id: string): Promise<TeamUser | null> {
  const agg = hasDb()
    ? `COALESCE(array_agg(ur.role) FILTER (WHERE ur.role IS NOT NULL), '{}')`
    : `group_concat(ur.role)`;
  const rows = await queryDb<Record<string, unknown>>(
    `SELECT u.id, u.name, u.email, u.phone, u.role AS legacy, u.created_at, ${agg} AS roles
     FROM users u LEFT JOIN user_roles ur ON ur.user_id = u.id
     WHERE u.id = $1 GROUP BY u.id, u.name, u.email, u.phone, u.role, u.created_at`,
    [id],
  );
  return rows.length > 0 ? rowToUser(rows[0]) : null;
}

export async function createUser(input: unknown): Promise<TeamUser> {
  const clean = validateUser(input);
  const id = `usr-${Date.now()}`;
  const q = insertQuery("users", COLS, {
    id,
    name: clean.name,
    email: clean.email,
    phone: clean.phone,
    // Passwords retired: OTP-only accounts carry a sentinel hash.
    password_hash: "otp-only",
    role: clean.role,
  });
  const rows = await queryDb<Record<string, unknown>>(q.text, q.values);
  const rq = insertQuery("user_roles", ["user_id", "role"], { user_id: id, role: clean.role });
  await queryDb(rq.text, rq.values);
  return rowToUser({ ...rows[0], roles: clean.role });
}

/** Replace a user's profile set (checkbox UI). Legacy primary follows the set. */
export async function setUserRoles(id: string, roles: unknown): Promise<TeamUser> {
  const clean = parseRoles(roles);
  const primary = clean.includes("superadmin") ? "superadmin" : clean[0];
  await queryDb("DELETE FROM user_roles WHERE user_id = $1", [id]);
  for (const role of clean) {
    const q = insertQuery("user_roles", ["user_id", "role"], { user_id: id, role });
    await queryDb(q.text, q.values);
  }
  await queryDb("UPDATE users SET role = $1 WHERE id = $2", [primary, id]);
  const [user] = await queryDb<Record<string, unknown>>(
    "SELECT id, name, email, role AS legacy, created_at FROM users WHERE id = $1",
    [id],
  );
  return { ...rowToUser({ ...user, roles: clean.join(",") }), roles: clean };
}

export async function deleteUser(id: string, actorId: string): Promise<void> {
  if (id === actorId) throw new Error("cannot delete your own account");
  const q = deleteQuery("users", id);
  await queryDb(q.text, q.values);
}
