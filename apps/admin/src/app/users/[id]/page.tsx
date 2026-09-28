import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { ROLES, canManageUsers, type Role } from "@/lib/access";
import { getUserById, getUserLinks, listRoleGrants } from "@/lib/users";
import { getBalance, listTransactions } from "@/lib/wallet";
import { Badge, Btn, Card, Field, PageHeader, inputCls } from "../../ui";
import { deleteUserAction, setActiveAction, setUserRolesAction, updateIdentityAction } from "../actions";

const peso = (c: number) => `₱${(c / 100).toFixed(2)}`;

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const role = (session?.user as { role?: Role } | undefined)?.role;
  if (!role || !canManageUsers(role)) redirect("/no-access");
  const selfId = (session?.user as { id?: string })?.id ?? "";
  const { id } = await params;
  const user = await getUserById(id);
  if (!user) notFound();
  const [balance, txs, links, grants] = await Promise.all([
    getBalance(id),
    listTransactions(id, 10),
    getUserLinks(id),
    listRoleGrants(id),
  ]);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={user.name}
        badge={
          <Badge tone={!user.active ? "bad" : user.role === "superadmin" ? "info" : "neutral"}>
            {!user.active ? "suspended" : user.role}
          </Badge>
        }
      />
      <p className="-mt-2 text-sm text-zinc-500 tabular-nums">
        {user.email} · {user.phone ?? "no phone"} · joined{" "}
        {user.createdAt.slice(0, 10)} · last sign-in {user.lastLoginAt?.slice(0, 10) ?? "never"}
      </p>
      {(links.riderId || links.driverId || links.applications.length > 0) && (
        <Card>
          <h2 className="mb-1 font-semibold">Linked profiles</h2>
          <ul className="flex flex-wrap gap-3 text-sm">
            {links.riderId && <li>Rider profile: <span className="font-mono text-xs">{links.riderId}</span></li>}
            {links.driverId && (
              <li>
                Driver profile:{" "}
                <a href={`/fleet/drivers/${links.driverId}`} className="underline">
                  open →
                </a>
              </li>
            )}
            {links.applications.map((a) => (
              <li key={a.id}>
                Agency application: {a.businessName} ({a.status})
              </li>
            ))}
          </ul>
        </Card>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-semibold">Identity</h2>
          <form action={updateIdentityAction.bind(null, user.id)} className="flex flex-col gap-2">
            <Field label="Name">
              <input name="name" required defaultValue={user.name} className={inputCls} />
            </Field>
            <Field label="Email">
              <input name="email" type="email" required defaultValue={user.email} className={inputCls} />
            </Field>
            <Field label="Phone (OTP login)">
              <input name="phone" required defaultValue={user.phone ?? ""} className={inputCls} />
            </Field>
            <div>
              <Btn tone="primary" type="submit">
                Save identity
              </Btn>
            </div>
          </form>
          <div className="mt-3 border-t border-zinc-100 pt-3">
            <form
              action={setActiveAction.bind(null, user.id, !user.active)}
              className="flex items-center gap-2"
            >
              <Btn tone={user.active ? "warn" : "primary"} type="submit" disabled={user.id === selfId}>
                {user.active ? "Suspend access" : "Restore access"}
              </Btn>
            </form>
            {!user.active && (
              <p className="mt-1 text-xs text-red-600">
                Suspended — sign-in fails closed. Existing sessions expire within 8h.
              </p>
            )}
          </div>
        </Card>
        <Card>
          <h2 className="mb-2 font-semibold">Profiles</h2>
          <form action={setUserRolesAction.bind(null, user.id)}>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {ROLES.map((r: Role) => (
                <label key={r} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    name="roles"
                    value={r}
                    defaultChecked={user.roles.includes(r)}
                    className="accent-green-600"
                  />
                  {r}
                </label>
              ))}
            </div>
            <Btn type="submit" tone="primary" className="mt-2">
              Save roles
            </Btn>
          </form>
          <div className="mt-4 border-t border-zinc-100 pt-3">
            <form action={deleteUserAction.bind(null, user.id)} className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-sm">
                <input type="checkbox" required className="accent-red-600" /> I understand
              </label>
              <Btn
                tone="danger"
                type="submit"
                disabled={user.id === selfId}
                title={user.id === selfId ? "Cannot delete your own account" : undefined}
              >
                Delete account
              </Btn>
            </form>
          </div>
          {grants.length > 0 && (
            <div className="mt-3 border-t border-zinc-100 pt-2">
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Role history
              </h3>
              <ul className="flex flex-col gap-1 text-xs text-zinc-600">
                {grants.slice(0, 8).map((g) => (
                  <li key={g.id} className="tabular-nums">
                    {g.granted ? "granted" : "revoked"} {g.role} · {g.createdAt.slice(0, 10)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Wallet</h2>
            <Badge tone="info">{peso(balance)}</Badge>
          </div>
          <a href={`/wallets/${user.id}`} className="text-xs underline">
            Open in ledger →
          </a>
          {txs.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">No movements yet.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {txs.slice(0, 5).map((t) => (
                <li key={t.id} className="flex items-center justify-between border-t border-zinc-100 pt-1 first:border-0 first:pt-0">
                  <span>
                    {t.type}
                    {t.memo && <span className="block text-xs text-zinc-600">{t.memo}</span>}
                  </span>
                  <span className={`font-semibold tabular-nums ${t.amountCents < 0 ? "text-red-600" : "text-brand-700"}`}>
                    {t.amountCents < 0 ? "−" : "+"}{peso(Math.abs(t.amountCents))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
