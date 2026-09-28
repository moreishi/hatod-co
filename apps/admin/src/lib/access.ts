// Edge-safe: no node:* imports — usable from src/proxy.ts.
//
// superadmin/operations/finance/support = ops team (admin panel).
// agency/driver/rider = app identities (mobile apps, sessions valid but no panel access).
export type Role =
  | "superadmin"
  | "operations"
  | "finance"
  | "support"
  | "agency"
  | "driver"
  | "rider";

export const ROLES: Role[] = [
  "superadmin",
  "operations",
  "finance",
  "support",
  "agency",
  "driver",
  "rider",
];

const STAFF: Role[] = ["superadmin", "operations", "finance", "support"];

/** Admin-panel gate: ops team only. */
export function isStaff(role: Role): boolean {
  return STAFF.includes(role);
}

/** Superadmin passes every gate; everyone else needs an exact role match. */
export function canAccess(role: Role, required: Role): boolean {
  if (role === "superadmin") return true;
  return role === required;
}

/** Set version: a user holds many profiles (rider + driver at once). */
export function hasRole(roles: Role[], required: Role): boolean {
  if (roles.includes("superadmin")) return true;
  return roles.includes(required);
}

/** Team account management is superadmin-only. */
export function canManageUsers(role: Role): boolean {
  return role === "superadmin";
}

/** Agency applications are reviewed by superadmin or operations. */
export function canReviewAgency(role: Role): boolean {
  return role === "superadmin" || role === "operations";
}

const PUBLIC_PREFIXES = [
  "/login",
  "/api/",
  "/no-access",
  "/apply",
  "/fleet/login",
  "/drivers/login",
];

/** Paths the proxy lets through without a session. */
export function isPublicPath(pathname: string): boolean {
  if (pathname === "/login") return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}
