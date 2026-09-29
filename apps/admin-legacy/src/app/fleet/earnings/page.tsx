import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isStaff, type Role } from "@/lib/access";
import { balanceDue, summarizeTrips } from "@/lib/earnings";
import { listAgencyTrips, listPayouts } from "@/lib/ledger";
import { Badge, Card, Field, PageHeader, inputCls } from "../../ui";
import { Btn } from "../../ui";
import { recordPayoutAction } from "../actions";

export default async function FleetEarningsPage() {
  const session = await auth();
  const u = session?.user as { id?: string; roles?: Role[] } | undefined;
  const roles = u?.roles ?? [];
  if (roles.some((r) => isStaff(r))) redirect("/");
  if (!roles.includes("agency")) redirect("/no-access");
  const trips = await listAgencyTrips(u?.id ?? "");
  const s = summarizeTrips(trips);
  const payouts = await listPayouts(u?.id ?? "");
  const paid = payouts.reduce((n, p) => n + p.amount, 0);
  const owed = balanceDue(s.net, paid);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Fleet earnings" badge={<Badge tone="info">15% platform cut</Badge>} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Completed rides", s.rides],
          ["Gross", `₱${s.gross}`],
          [`Cash / GCash`, `₱${s.cash} / ₱${s.gcash}`],
          ["Net to fleet", `₱${s.net}`],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
            <p className="mt-1 font-sans text-2xl font-bold tabular-nums">{value}</p>
          </Card>
        ))}
      </div>
      <Card>
        <h2 className="mb-2 font-semibold">Payouts — ₱{owed} owed</h2>
        <form action={recordPayoutAction} className="mb-3 flex flex-wrap items-end gap-3">
          <Field label="Period start">
            <input name="periodStart" type="date" required className={inputCls} />
          </Field>
          <Field label="Period end">
            <input name="periodEnd" type="date" required className={inputCls} />
          </Field>
          <Field label="Amount (₱)">
            <input
              name="amount"
              type="number"
              required
              min={1}
              defaultValue={owed > 0 ? owed : undefined}
              placeholder={String(owed)}
              className={inputCls}
            />
          </Field>
          <Btn tone="primary" type="submit" disabled={owed <= 0}>
            Record payout
          </Btn>
        </form>
        {payouts.length === 0 ? (
          <p className="text-sm text-zinc-500">No payouts recorded yet.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {payouts.map((p) => (
              <li key={p.id} className="flex items-center justify-between border-t border-zinc-100 pt-1 first:border-0 first:pt-0">
                <span className="tabular-nums">
                  {p.periodStart} → {p.periodEnd}
                </span>
                <span className="font-semibold tabular-nums">₱{p.amount}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card flush>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2">Trip</th>
                <th className="px-4 py-2">Driver</th>
                <th className="px-4 py-2">Route</th>
                <th className="px-4 py-2">Fare</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {trips.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-zinc-500">
                    No trips yet — completed rides for your fleet appear here.
                  </td>
                </tr>
              )}
              {trips.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-50/60">
                  <td className="px-4 py-2">
                    <p className="font-medium tabular-nums">{t.id}</p>
                    <p className="text-xs text-zinc-500">
                      {t.riderName} · {t.payment}
                    </p>
                  </td>
                  <td className="px-4 py-2">{t.driverName}</td>
                  <td className="px-4 py-2 text-xs">
                    {t.pickup} → {t.dropoff}
                  </td>
                  <td className="px-4 py-2 font-semibold tabular-nums">₱{t.fareQuote}</td>
                  <td className="px-4 py-2">
                    <Badge tone={t.status === "COMPLETED" ? "ok" : "info"}>{t.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
