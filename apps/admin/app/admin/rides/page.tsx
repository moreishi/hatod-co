import Link from "next/link";
import { RideStatus } from "@hailing/constants";
import { apiAsUser } from "@/lib/api.js";
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
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const skip = (page - 1) * PAGE_SIZE;
  const query = new URLSearchParams();
  if (status) query.set("status", status);
  query.set("take", String(PAGE_SIZE));
  query.set("skip", String(skip));
  const rides = await apiAsUser<RideRow[]>(`/api/admin/rides?${query}`);
  const base = `/admin/rides${status ? `?status=${status}` : ""}`;
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-3xl font-bold">Rides</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/admin/rides"
          className={`rounded-full px-3 py-1 text-xs ${!status ? "bg-brand-700 text-white" : "bg-white text-slate-600 border"}`}
        >
          All
        </Link>
        {Object.values(RideStatus).map((s) => (
          <Link
            key={s}
            href={`/admin/rides?status=${s}`}
            className={`rounded-full px-3 py-1 font-mono text-xs ${status === s ? "bg-brand-700 text-white" : "bg-white text-slate-600 border"}`}
          >
            {s}
          </Link>
        ))}
      </div>
      <ul className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
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
              <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-xs">
                {ride.status}
              </span>
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
      <Pager base={base} page={page} fullPage={rides.length === PAGE_SIZE} />
    </main>
  );
}
