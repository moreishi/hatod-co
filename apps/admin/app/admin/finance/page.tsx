import { apiAsUser } from "@/lib/api.js";
import { humanTxnType } from "@/lib/status.js";
import { Card } from "@/components/ui/card.js";
import { AdminNav } from "../admin-nav.js";
import { PAGE_SIZE, Pager } from "../pager.js";

interface TxnRow {
  id: string;
  type: string;
  amountCentavos: number;
  rideId: string | null;
  reference: string | null;
  createdAt: string;
}

interface Summary {
  byType: { type: string; totalCentavos: number; count: number }[];
  wallets: number;
}

export default async function AdminFinancePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const skip = (page - 1) * PAGE_SIZE;
  const [summary, txns] = await Promise.all([
    apiAsUser<Summary>("/api/admin/finance/summary"),
    apiAsUser<TxnRow[]>(
      `/api/admin/transactions?take=${PAGE_SIZE}&skip=${skip}`,
    ),
  ]);
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <AdminNav />
      <h1 className="mt-4 text-3xl font-bold">Finance</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        Platform money at a glance: totals per ledger type plus the latest
        wallet movements.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {summary.byType.map((row) => (
          <Card key={row.type} className="p-4">
            <p className="font-mono text-xs text-slate-500" title={row.type}>
              {humanTxnType(row.type)}
            </p>
            <p className="mt-1 text-xl font-bold">
              ₱{(row.totalCentavos / 100).toFixed(2)}
            </p>
            <p className="text-xs text-slate-500">{row.count} txns</p>
          </Card>
        ))}
        <Card className="p-4">
          <p className="font-mono text-xs text-slate-500">WALLETS</p>
          <p className="mt-1 text-xl font-bold">{summary.wallets}</p>
        </Card>
      </div>
      <h2 className="mt-10 text-lg font-semibold">Latest transactions</h2>
      <Card className="mt-3 overflow-hidden p-0">
        <ul className="divide-y">
          {txns.map((txn) => (
            <li
              key={txn.id}
              className="flex flex-wrap items-center justify-between gap-3 px-6 py-3"
            >
              <div>
                <p className="text-sm font-medium" title={txn.type}>
                  {humanTxnType(txn.type)} ·{" "}
                  {txn.rideId ? txn.rideId.slice(0, 8) : (txn.reference ?? "—")}
                </p>
                <p className="font-mono text-xs text-slate-500">
                  {new Date(txn.createdAt).toLocaleString()}
                </p>
              </div>
              <span
                className={`font-mono text-sm font-semibold ${txn.amountCentavos < 0 ? "text-red-600" : "text-emerald-700"}`}
              >
                {txn.amountCentavos < 0 ? "−" : "+"}₱
                {(Math.abs(txn.amountCentavos) / 100).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <Pager
        base="/admin/finance"
        page={page}
        fullPage={txns.length === PAGE_SIZE}
      />
    </main>
  );
}
