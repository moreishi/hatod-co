import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { canAccessAgency } from "@/lib/agency-guard.js";
import { verifySession } from "@/lib/session.js";

const SECRET = process.env.JWT_SECRET ?? "localstage-only-dev-secret";

/**
 * Per-agency page guard (defense in depth — the API re-checks membership
 * on every call per spec rule 49). Members of this agency or platform
 * admins pass; everyone else lands on /no-access.
 */
export default async function AgencyLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const token = (await cookies()).get("hailing_session")?.value;
  let roles: string[] = [];
  try {
    if (!token) throw new Error("no session");
    roles = verifySession(token, SECRET).roles;
  } catch {
    redirect("/login");
  }
  if (!canAccessAgency(roles, id)) redirect("/no-access");
  return <>{children}</>;
}
