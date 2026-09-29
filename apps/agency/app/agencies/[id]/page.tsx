import Link from "next/link";
import { agencyDrivers } from "@/lib/api.js";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  SUSPENDED: "bg-red-50 text-red-700",
  APPLICANT: "bg-slate-100 text-slate-600",
  DOCUMENTS_PENDING: "bg-amber-50 text-amber-800",
  DOCUMENTS_UNDER_REVIEW: "bg-amber-50 text-amber-800",
};

export default async function DriverBoard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const drivers = await agencyDrivers(id);
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <Link href="/" className="text-sm font-medium text-brand-700">
        ← Agencies
      </Link>
      <h1 className="mt-2 text-3xl font-bold">Driver board</h1>
      <Link
        href={`/agencies/${id}/dispatch`}
        className="mt-1 inline-block text-sm font-medium text-brand-700"
      >
        Open dispatch →
      </Link>
      <p className="mt-1 font-mono text-xs text-slate-500">{id}</p>
      <ul className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
        {drivers.map((driver) => (
          <li
            key={driver.id}
            className="flex items-center justify-between gap-4 px-6 py-4"
          >
            <div>
              <p className="font-medium">{driver.user.displayName}</p>
              <p className="font-mono text-xs text-slate-500">
                {driver.user.phone}
              </p>
              <p className="text-xs text-slate-500">
                {driver.assignments[0]
                  ? `${driver.assignments[0].vehicle.plateNo} · ${driver.assignments[0].vehicle.type}`
                  : "no vehicle assigned"}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 font-mono text-xs ${STATUS_STYLES[driver.status] ?? "bg-slate-100 text-slate-600"}`}
            >
              {driver.status}
            </span>
          </li>
        ))}
        {drivers.length === 0 && (
          <li className="px-6 py-8 text-slate-600">No drivers yet.</li>
        )}
      </ul>
    </main>
  );
}
