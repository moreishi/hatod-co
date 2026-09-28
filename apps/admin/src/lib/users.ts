import { z } from "zod";
import { deleteQuery, insertQuery, isUniqueViolation } from "./repo";
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Editable identity (detail page): name/email required, phone normalized. */
export function validateIdentity(input: {
  name: string;
  email: string;
  phone: string;
}): { name: string; email: string; phone: string } {
  const name = input.name.trim();
  if (!name) throw new Error("name is required");
  const email = input.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw new Error("invalid email");
  let phone: string;
  try {
    phone = normalizePhPhone(input.phone);
  } catch {
    throw new Error("invalid phone");
  }
  return { name, email, phone };
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
  active: boolean;
  lastLoginAt: string | null;
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
    active: row.active == null ? true : row.active === true || row.active === 1,
    lastLoginAt: row.last_login_at == null ? null : new Date(row.last_login_at as string).toISOString(),
    createdAt: new Date(row.created_at as string).toISOString(),
  };
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
    `SELECT u.id, u.name, u.email, u.phone, u.active, u.last_login_at, u.role AS legacy, u.created_at, ${agg} AS roles
     FROM users u LEFT JOIN user_roles urr ON urr.user_id = u.id ${where}
     GROUP BY u.id, u.name, u.email, u.phone, u.active, u.last_login_at, u.role, u.created_at ORDER BY u.created_at ASC LIMIT ${limit} OFFSET ${offset}`,
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
    `SELECT u.id, u.name, u.email, u.phone, u.active, u.last_login_at, u.role AS legacy, u.created_at, ${agg} AS roles
     FROM users u LEFT JOIN user_roles ur ON ur.user_id = u.id
     WHERE u.id = $1 GROUP BY u.id, u.name, u.email, u.phone, u.active, u.last_login_at, u.role, u.created_at`,
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
export async function setUserRoles(
  id: string,
  roles: unknown,
  actorId?: string,
): Promise<TeamUser> {
  const clean = parseRoles(roles);
  const before = await getUserById(id);
  const primary = clean.includes("superadmin") ? "superadmin" : clean[0];
  await queryDb("DELETE FROM user_roles WHERE user_id = $1", [id]);
  for (const role of clean) {
    const q = insertQuery("user_roles", ["user_id", "role"], { user_id: id, role });
    await queryDb(q.text, q.values);
  }
  await queryDb("UPDATE users SET role = $1 WHERE id = $2", [primary, id]);
  // Audit the diff (grants + revocations) under the acting admin.
  const had = new Set(before?.roles ?? []);
  const has = new Set(clean);
  for (const role of clean) {
    if (!had.has(role)) await recordRoleGrant(id, role, true, actorId ?? null);
  }
  for (const role of had) {
    if (!has.has(role)) await recordRoleGrant(id, role, false, actorId ?? null);
  }
  const [user] = await queryDb<Record<string, unknown>>(
    "SELECT id, name, email, role AS legacy, created_at FROM users WHERE id = $1",
    [id],
  );
  return { ...rowToUser({ ...user, roles: clean.join(",") }), roles: clean };
}

async function recordRoleGrant(
  userId: string,
  role: Role,
  granted: boolean,
  actorId: string | null,
): Promise<void> {
  const q = insertQuery("role_grants", ["id", "user_id", "role", "granted", "actor_id"], {
    id: `rg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user_id: userId,
    role,
    granted: granted ? 1 : 0,
    actor_id: actorId,
  });
  await queryDb(q.text, q.values);
}

export interface RoleGrant {
  id: string;
  role: string;
  granted: boolean;
  actorId: string | null;
  createdAt: string;
}

export async function listRoleGrants(userId: string): Promise<RoleGrant[]> {
  const rows = await queryDb<Record<string, unknown>>(
    "SELECT * FROM role_grants WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30",
    [userId],
  );
  return rows.map((r) => ({
    id: String(r.id),
    role: String(r.role),
    granted: r.granted === true || r.granted === 1,
    actorId: r.actor_id == null ? null : String(r.actor_id),
    createdAt: new Date(r.created_at as string).toISOString(),
  }));
}

/** Edit identity (detail page). Uniqueness enforced by DB, mapped friendly. */
export async function updateIdentity(
  id: string,
  input: { name: string; email: string; phone: string },
): Promise<TeamUser> {
  const clean = validateIdentity(input);
  try {
    await queryDb("UPDATE users SET name = $1, email = $2, phone = $3 WHERE id = $4", [
      clean.name,
      clean.email,
      clean.phone,
      id,
    ]);
  } catch (err) {
    if (isUniqueViolation(err)) {
      const msg = String((err as { message?: string }).message ?? "");
      throw new Error(/email/i.test(msg) ? "email already registered" : "phone already registered");
    }
    throw err;
  }
  const updated = await getUserById(id);
  if (!updated) throw new Error("account not found");
  return updated;
}

/** Suspend (false) or restore (true). Suspended accounts fail closed at sign-in. */
export async function setActive(id: string, active: boolean, actorId: string): Promise<TeamUser> {
  if (id === actorId) throw new Error("cannot suspend your own account");
  await queryDb("UPDATE users SET active = $1 WHERE id = $2", [active ? 1 : 0, id]);
  const updated = await getUserById(id);
  if (!updated) throw new Error("account not found");
  return updated;
}

export interface UserLinks {
  riderId: string | null;
  driverId: string | null;
  applications: { id: string; businessName: string; status: string }[];
}

/** Everything attached to one login: profiles + agency applications. */
export async function getUserLinks(userId: string): Promise<UserLinks> {
  const [riders, drivers, apps] = await Promise.all([
    queryDb<{ id: string }>("SELECT id FROM riders WHERE user_id = $1", [userId]),
    queryDb<{ id: string }>("SELECT id FROM drivers WHERE user_id = $1", [userId]),
    queryDb<Record<string, unknown>>(
      "SELECT id, business_name, status FROM agency_applications WHERE user_id = $1 ORDER BY created_at DESC",
      [userId],
    ),
  ]);
  return {
    riderId: riders[0]?.id ?? null,
    driverId: drivers[0]?.id ?? null,
    applications: apps.map((a) => ({
      id: String(a.id),
      businessName: String(a.business_name),
      status: String(a.status),
    })),
  };
}

export async function deleteUser(id: string, actorId: string): Promise<void> {
  if (id === actorId) throw new Error("cannot delete your own account");
  const q = deleteQuery("users", id);
  await queryDb(q.text, q.values);
}
