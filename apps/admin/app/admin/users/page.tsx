import { apiAsUser, type AdminUserDto, type InvitationDto } from "@/lib/api.js";
import { Card } from "@/components/ui/card.js";
import { AdminNav } from "../admin-nav.js";
import { InviteForm } from "./invite-form.js";

export default async function AdminUsersPage() {
  const [users, invitations] = await Promise.all([
    apiAsUser<AdminUserDto[]>("/api/admin/users"),
    apiAsUser<InvitationDto[]>("/api/admin/invitations"),
  ]);
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">
        Hailing · Admin
      </p>
      <AdminNav />
      <h1 className="mt-4 text-3xl font-bold">Administrators</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        Platform admins only — agency staff are managed inside each agency
        portal. Invites expire; roles apply on accept.
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Invite admin</h2>
        <InviteForm />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">
          Pending invitations ({invitations.length})
        </h2>
        <Card className="mt-3 overflow-hidden p-0">
          <ul className="divide-y">
            {invitations.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between px-6 py-3"
              >
                <span>
                  {inv.email} ·{" "}
                  <span className="font-mono text-xs">{inv.role}</span>
                </span>
                <span className="text-xs text-slate-500">
                  expires {new Date(inv.expiresAt).toLocaleDateString()}
                </span>
              </li>
            ))}
            {invitations.length === 0 && (
              <li className="px-6 py-4 text-sm text-slate-500">
                No pending invitations.
              </li>
            )}
          </ul>
        </Card>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">
          Active admins ({users.length})
        </h2>
        <Card className="mt-3 overflow-hidden p-0">
          <ul className="divide-y">
            {users.map((user) => (
              <li
                key={user.id}
                className="flex items-center justify-between px-6 py-3"
              >
                <span>
                  {user.email ?? user.phone}{" "}
                  <span className="font-mono text-xs text-slate-500">
                    {user.phone}
                  </span>
                </span>
                <span className="flex gap-2">
                  {user.adminRoles.map((r) => (
                    <span
                      key={r.role}
                      className="rounded-full bg-brand-50 px-3 py-1 font-mono text-xs text-brand-700"
                    >
                      {r.role}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </main>
  );
}
