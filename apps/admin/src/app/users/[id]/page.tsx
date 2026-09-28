import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { ROLES, canManageUsers, type Role } from "@/lib/access";
import { getUserById } from "@/lib/users";
import { getBalance, listTransactions } from "@/lib/wallet";
import { Badge, Btn, Card, PageHeader } from "../../ui";
import { deleteUserAction, setUserRolesAction } from "../actions";

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
  const [balance, txs] = await Promise.all([getBalance(id), listTransactions(id, 10)]);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={user.name}
        badge={<Badge tone={user.role === "superadmin" ? "info" : "neutral"}>{user.role}</Badge>}
      />
      <p className="-mt-2 text-sm text-zinc-500 tabular-nums">
        {user.email} · {user.phone ?? "no phone"}
      </p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
