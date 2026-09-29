import { apiAsUser, type AdminUserDto, type InvitationDto } from "@/lib/api.js";
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
      <h1 className="mt-2 text-3xl font-bold">Administrators</h1>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Invite admin</h2>
        <InviteForm />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">
          Pending invitations ({invitations.length})
        </h2>
        <ul className="mt-3 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
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
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">
          Active admins ({users.length})
        </h2>
        <ul className="mt-3 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
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
      </section>
    </main>
  );
}
