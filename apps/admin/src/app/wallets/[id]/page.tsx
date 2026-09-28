import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { canManageUsers, type Role } from "@/lib/access";
import { getBalance, listTransactions } from "@/lib/wallet";
import { queryDb } from "@/lib/db";
import { Badge, Btn, Card, Field, PageHeader, inputCls } from "../../ui";
import { adjustWalletAction } from "../actions";

const peso = (c: number) => `₱${(c / 100).toFixed(2)}`;

export default async function WalletDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const roles = (session?.user as { roles?: Role[] } | undefined)?.roles ?? [];
  if (!roles.some((r) => canManageUsers(r))) redirect("/no-access");
  const { id } = await params;
  const rows = await queryDb<Record<string, unknown>>(
    "SELECT id, name, email, phone FROM users WHERE id = $1",
    [id],
  );
  const user = rows[0];
  if (!user) notFound();
  const [balance, txs] = await Promise.all([getBalance(id), listTransactions(id, 50)]);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={String(user.name)}
        badge={<Badge tone="info">{peso(balance)}</Badge>}
      />
      <p className="-mt-2 text-sm text-zinc-500 tabular-nums">
        {String(user.email)} · {user.phone == null ? "no phone" : String(user.phone)}
      </p>
      <Card>
        <h2 className="mb-2 font-semibold">Credit / debit</h2>
        <form action={adjustWalletAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="email" value={String(user.email)} />
          <Field label="Direction">
            <select name="direction" defaultValue="credit" className={inputCls}>
              <option value="credit">Credit (+)</option>
              <option value="debit">Debit (−)</option>
            </select>
          </Field>
          <Field label="Amount (₱)">
            <input name="amount" type="number" required min={1} placeholder="500" className={inputCls} />
          </Field>
          <Field label="Memo (optional)">
            <input name="memo" maxLength={140} placeholder="Friday payout" className={inputCls} />
          </Field>
          <Btn tone="primary" type="submit">
            Apply
          </Btn>
        </form>
        <p className="mt-2 text-xs text-zinc-500">
          Recorded as an <span className="font-mono">adjustment</span> under your admin id.
          Debits fail on insufficient balance.
        </p>
      </Card>
      <Card>
        <h2 className="mb-2 font-semibold">History</h2>
        {txs.length === 0 ? (
          <p className="text-sm text-zinc-500">No movements yet.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {txs.map((t) => (
              <li key={t.id} className="flex items-center justify-between border-t border-zinc-100 pt-1 first:border-0 first:pt-0">
                <span>
                  {t.type}
                  {t.memo && <span className="block text-xs text-zinc-600">{t.memo}</span>}
                  <span className="block font-mono text-xs text-zinc-500">{t.ref ?? t.id}</span>
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
  );
}
