// Edge-safe: no node:* imports — usable from src/proxy.ts.
export type Role = "superadmin" | "operations" | "finance" | "support";

export const ROLES: Role[] = ["superadmin", "operations", "finance", "support"];

/** Superadmin passes every gate; everyone else needs an exact role match. */
export function canAccess(role: Role, required: Role): boolean {
  if (role === "superadmin") return true;
  return role === required;
}

const PUBLIC_PREFIXES = ["/login", "/api/auth/"];

/** Paths the proxy lets through without a session. */
export function isPublicPath(pathname: string): boolean {
  if (pathname === "/login") return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}
