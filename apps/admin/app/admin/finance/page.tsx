import { apiAsUser } from "@/lib/api.js";

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

export default async function AdminFinancePage() {
  const [summary, txns] = await Promise.all([
    apiAsUser<Summary>("/api/admin/finance/summary"),
    apiAsUser<TxnRow[]>("/api/admin/transactions"),
  ]);
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-3xl font-bold">Finance</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {summary.byType.map((row) => (
          <section
            key={row.type}
            className="rounded-2xl border border-slate-200 bg-white p-4"
          >
            <p className="font-mono text-xs text-slate-500">{row.type}</p>
            <p className="mt-1 text-xl font-bold">
              ₱{(row.totalCentavos / 100).toFixed(2)}
            </p>
            <p className="text-xs text-slate-500">{row.count} txns</p>
          </section>
        ))}
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="font-mono text-xs text-slate-500">WALLETS</p>
          <p className="mt-1 text-xl font-bold">{summary.wallets}</p>
        </section>
      </div>
      <h2 className="mt-10 text-lg font-semibold">Latest transactions</h2>
      <ul className="mt-3 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
        {txns.map((txn) => (
          <li
            key={txn.id}
            className="flex flex-wrap items-center justify-between gap-3 px-6 py-3"
          >
            <div>
              <p className="font-mono text-sm">
                {txn.type} ·{" "}
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
    </main>
  );
}
