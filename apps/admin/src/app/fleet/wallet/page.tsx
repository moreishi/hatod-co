import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isStaff, type Role } from "@/lib/access";
import { listDrivers } from "@/lib/drivers";
import { getBalance, listTransactions } from "@/lib/wallet";
import { Badge, Card, PageHeader } from "../../ui";

const peso = (c: number) => `₱${(c / 100).toFixed(2)}`;

export default async function FleetWalletPage() {
  const session = await auth();
  const u = session?.user as { id?: string; roles?: Role[] } | undefined;
  const roles = u?.roles ?? [];
  if (roles.some((r) => isStaff(r))) redirect("/");
  if (!roles.includes("agency") || !u?.id) redirect("/no-access");
  const [balance, txs, fleet] = await Promise.all([
    getBalance(u.id),
    listTransactions(u.id),
    listDrivers({ agencyUserId: u.id }),
  ]);
  const fleetBalances = await Promise.all(
    fleet.map(async (d) => ({ driver: d, balance: await getBalance(d.userId ?? "__none__") })),
  );
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Fleet wallet" />
      <Card>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Agency balance
        </p>
        <p className="mt-1 font-sans text-3xl font-bold tabular-nums">{peso(balance)}</p>
        <p className="mt-1 text-xs text-zinc-500">
          Top-ups happen at the ops counter — ask operations to credit this account.
        </p>
      </Card>
      <Card>
        <div className="mb-2 flex items-center gap-2">
          <h2 className="font-semibold">Movements</h2>
          <Badge tone="info">{txs.length}</Badge>
        </div>
        {txs.length === 0 ? (
          <p className="text-sm text-zinc-500">No movements yet.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {txs.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between border-t border-zinc-100 pt-1 first:border-0 first:pt-0"
              >
                <span>
                  {t.type}
                  <span className="block font-mono text-xs text-zinc-500">{t.ref ?? t.id}</span>
                </span>
                <span
                  className={`font-semibold tabular-nums ${t.amountCents < 0 ? "text-red-600" : "text-brand-700"}`}
                >
                  {t.amountCents < 0 ? "−" : "+"}
                  {peso(Math.abs(t.amountCents))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card flush>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2">Driver</th>
                <th className="px-4 py-2">Wallet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {fleetBalances.map(({ driver, balance: b }) => (
                <tr key={driver.id} className="hover:bg-zinc-50/60">
                  <td className="px-4 py-2 font-medium">{driver.name}</td>
                  <td className="px-4 py-2 font-semibold tabular-nums">{peso(b)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
