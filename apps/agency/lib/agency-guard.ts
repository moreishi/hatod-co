/** Page-level membership: agency member or platform admin. API re-checks. */
export function canAccessAgency(roles: string[], agencyId: string): boolean {
  return roles.some(
    (r) => r.startsWith(`AGENCY:${agencyId}:`) || r.startsWith("ADMIN:"),
  );
}
