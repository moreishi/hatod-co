import Link from "next/link";
import { RideStatus } from "@hailing/constants";
import { apiAsUser } from "@/lib/api.js";
import { humanStatus } from "@/lib/status.js";
import { Badge } from "@/components/ui/badge.js";
import { Card } from "@/components/ui/card.js";
import { AdminNav } from "../admin-nav.js";
import { PAGE_SIZE, Pager } from "../pager.js";

interface RideRow {
  id: string;
  status: string;
  pickupLabel: string;
  dropoffLabel: string;
  fareCentavos: number;
  paymentMethod: string;
  driver: { user: { displayName: string } } | null;
}

export default async function AdminRidesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; q?: string }>;
}) {
  const { status, page: pageParam, q } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const skip = (page - 1) * PAGE_SIZE;
  const query = new URLSearchParams();
  if (status) query.set("status", status);
  if (q) query.set("q", q);
  query.set("take", String(PAGE_SIZE));
  query.set("skip", String(skip));
  const rides = await apiAsUser<RideRow[]>(`/api/admin/rides?${query}`);
  const kept = `${status ? `?status=${status}` : ""}`;
  const base = `/admin/rides${kept}${q ? `${kept ? "&" : "?"}q=${encodeURIComponent(q)}` : ""}`;
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <AdminNav />
      <h1 className="mt-4 text-3xl font-bold">Rides</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        Every trip on the platform. Filter by state to follow the live ones or
        audit the finished ones.
      </p>
      <form
        method="get"
        action="/admin/rides"
        className="mt-4 flex max-w-md gap-2"
      >
        {status && <input type="hidden" name="status" value={status} />}
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search route or driver…"
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white"
        >
          Search
        </button>
        {q && (
          <Link
            href={`/admin/rides${status ? `?status=${status}` : ""}`}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            Clear
          </Link>
        )}
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/admin/rides${q ? `?q=${encodeURIComponent(q)}` : ""}`}
          className={`rounded-full px-3 py-1 text-xs ${!status ? "bg-brand-700 text-white" : "bg-white text-slate-600 border"}`}
        >
          All
        </Link>
        {Object.values(RideStatus).map((s) => (
          <Link
            key={s}
            href={`/admin/rides?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            title={s}
            className={`rounded-full px-3 py-1 text-xs ${status === s ? "bg-brand-700 text-white" : "bg-white text-slate-600 border"}`}
          >
            {humanStatus(s)}
          </Link>
        ))}
      </div>
      <Card className="mt-6 overflow-hidden p-0">
        <ul className="divide-y">
          {rides.map((ride) => (
            <li
              key={ride.id}
              className="flex flex-wrap items-center justify-between gap-3 px-6 py-3"
            >
              <div>
                <p className="font-medium">
                  {ride.pickupLabel} → {ride.dropoffLabel}
                </p>
                <p className="font-mono text-xs text-slate-500">
                  {ride.id} · {ride.driver?.user.displayName ?? "unassigned"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm">
                  ₱{(ride.fareCentavos / 100).toFixed(2)}
                </span>
                <Badge variant="secondary" title={ride.status}>
                  {humanStatus(ride.status)}
                </Badge>
                <span className="font-mono text-xs text-slate-500">
                  {ride.paymentMethod}
                </span>
              </div>
            </li>
          ))}
          {rides.length === 0 && (
            <li className="px-6 py-4 text-sm text-slate-500">No rides.</li>
          )}
        </ul>
      </Card>
      <Pager base={base} page={page} fullPage={rides.length === PAGE_SIZE} />
    </main>
  );
}
