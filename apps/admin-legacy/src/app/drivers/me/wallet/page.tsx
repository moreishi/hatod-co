import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isStaff, type Role } from "@/lib/access";
import { getDriverByUser } from "@/lib/drivers";
import { getBalance, listTransactions } from "@/lib/wallet";
import { Badge, Card, PageHeader } from "../../../ui";

const peso = (c: number) => `₱${(c / 100).toFixed(2)}`;

export default async function DriverWalletPage() {
  const session = await auth();
  const u = session?.user as { id?: string; roles?: Role[] } | undefined;
  const roles = u?.roles ?? [];
  if (roles.some((r) => isStaff(r))) redirect("/drivers");
  if (!roles.includes("driver")) redirect("/no-access");
  if (!u?.id) redirect("/no-access");
  const profile = await getDriverByUser(u.id);
  if (!profile) redirect("/no-access");
  const balance = await getBalance(u.id);
  const txs = await listTransactions(u.id);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="My wallet" />
      <Card>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Balance</p>
        <p className="mt-1 font-sans text-3xl font-bold tabular-nums">{peso(balance)}</p>
        <p className="mt-1 text-xs text-zinc-500">
          Top-ups happen at your agency or ops counter. Ride payouts land here on completion.
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
    </div>
  );
}
