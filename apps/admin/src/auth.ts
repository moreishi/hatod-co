import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { matchUserByPhone, normalizePhPhone } from "@/lib/phone";
import { ROLES, type Role } from "@/lib/access";
import { queryDb } from "@/lib/db";
import { verifyOtp } from "@/lib/otpStore";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
}

/** OTP identity: users.phone first, then driver profiles linked to accounts. */
async function findUserByPhone(phone: string): Promise<UserRow | null> {
  const direct = await queryDb<UserRow>("SELECT * FROM users WHERE phone = $1", [phone]);
  if (direct[0]) return direct[0];
  const drows = await queryDb<{ user_id: string | null; phone: string }>(
    "SELECT user_id, phone FROM drivers",
    [],
  );
  const hit = matchUserByPhone(
    phone,
    drows.map((d, i) => ({ id: `${i}:${d.user_id ?? ""}`, phone: d.phone })),
  );
  const userId = hit?.id.split(":")[1];
  if (!userId) return null;
  const rows = await queryDb<UserRow>("SELECT * FROM users WHERE id = $1", [userId]);
  return rows[0] ?? null;
}

async function loadRoles(userId: string, legacy: string): Promise<Role[]> {
  const set = new Set<Role>();
  if (ROLES.includes(legacy as Role)) set.add(legacy as Role);
  const rows = await queryDb<{ role: string }>(
    "SELECT role FROM user_roles WHERE user_id = $1",
    [userId],
  );
  for (const r of rows) if (ROLES.includes(r.role as Role)) set.add(r.role as Role);
  return [...set];
}

// Node runtime only (route handlers + server actions): real DB-backed authorize.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { phone: {}, code: {} },
      authorize: async (raw) => {
        const phoneRaw = String((raw as Record<string, unknown>)?.phone ?? "");
        const code = String((raw as Record<string, unknown>)?.code ?? "").trim();
        let phone: string;
        try {
          phone = normalizePhPhone(phoneRaw);
        } catch {
          return null;
        }
        let ok = false;
        try {
          ok = await verifyOtp(phone, code);
        } catch (err) {
          // Never leak a 500 HTML page to the Auth.js client (it parses JSON).
          console.error("[auth] authorize failed:", err);
          return null;
        }
        if (!ok) return null;
        let u: UserRow | null = null;
        try {
          u = await findUserByPhone(phone);
        } catch (err) {
          console.error("[auth] authorize failed:", err);
          return null;
        }
        if (!u) return null;
        if (!ROLES.includes(u.role as Role)) return null;
        const roles = await loadRoles(u.id, u.role).catch(() => [u.role as Role]);
        const primary = roles.includes("superadmin") ? "superadmin" : roles[0];
        return { id: u.id, name: u.name, email: u.email, role: primary, roles };
      },
    }),
  ],
});
