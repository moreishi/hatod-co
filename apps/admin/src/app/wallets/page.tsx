import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canManageUsers, type Role } from "@/lib/access";
import { TX_TYPES, listRecentTransactions, listWalletsPaged } from "@/lib/wallet";
import { Badge, Btn, Card, Field, PageHeader, inputCls } from "../ui";

const peso = (c: number) => `₱${(c / 100).toFixed(2)}`;

export default async function WalletsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; type?: string }>;
}) {
  const session = await auth();
  const roles = (session?.user as { roles?: Role[] } | undefined)?.roles ?? [];
  if (!roles.some((r) => canManageUsers(r))) redirect("/no-access");
  const { q = "", page = "1", type = "" } = await searchParams;
  const { rows, total, page: safe, pages } = await listWalletsPaged(q, Number(page) || 1);
  const txs = await listRecentTransactions(30, type);
  const prev = new URLSearchParams({ q, page: String(Math.max(1, safe - 1)) }).toString();
  const next = new URLSearchParams({ q, page: String(Math.min(pages, safe + 1)) }).toString();
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Wallets"
        badge={<Badge tone="info">{total} accounts · page {safe}/{pages}</Badge>}
      />
      <Card>
        <form method="GET" className="flex items-end gap-2">
          <div className="flex-1">
            <Field label="Search name, email, or phone">
              <input
                name="q"
                defaultValue={q}
                placeholder="Ria, rider@…, 0917…"
                className={inputCls}
              />
            </Field>
          </div>
          <input type="hidden" name="page" value="1" />
          <Btn type="submit">Search</Btn>
        </form>
      </Card>
      <Card flush>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2">Account</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">Balance</th>
                <th className="px-4 py-2">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-zinc-500">
                    No accounts match.
                  </td>
                </tr>
              )}
              {rows.map((w) => (
                <tr key={w.userId} className="hover:bg-zinc-50/60">
                  <td className="px-4 py-2">
                    <p className="font-medium">{w.name}</p>
                    <p className="text-xs text-zinc-500">{w.email}</p>
                  </td>
                  <td className="px-4 py-2 tabular-nums">{w.phone ?? "—"}</td>
                  <td className="px-4 py-2 font-semibold tabular-nums">{peso(w.balanceCents)}</td>
                  <td className="px-4 py-2">
                    <a href={`/wallets/${w.userId}`} className="underline">
                      Adjust →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-2 text-sm">
          <a
            href={`/wallets?${prev}`}
            aria-disabled={safe <= 1}
            className={safe <= 1 ? "pointer-events-none text-zinc-300" : "underline"}
          >
            ← Prev
          </a>
          <span className="text-xs text-zinc-500 tabular-nums">
            Page {safe} of {pages} · {total} total
          </span>
          <a
            href={`/wallets?${next}`}
            aria-disabled={safe >= pages}
            className={safe >= pages ? "pointer-events-none text-zinc-300" : "underline"}
          >
            Next →
          </a>
        </div>
      </Card>
      <Card>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Latest movements</h2>
          <form method="GET" className="flex items-center gap-2 text-sm">
            <input type="hidden" name="q" value={q} />
            <input type="hidden" name="page" value={String(safe)} />
            <select name="type" defaultValue={type} className={`${inputCls} text-xs`}>
              <option value="">All types</option>
              {TX_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <Btn type="submit">Filter</Btn>
          </form>
        </div>
        {txs.length === 0 ? (
          <p className="text-sm text-zinc-500">No movements yet.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {txs.map((t) => (
              <li key={t.id} className="flex items-center justify-between border-t border-zinc-100 pt-1 first:border-0 first:pt-0">
                <span>
                  {t.type} · {t.email}
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
