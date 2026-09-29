import Link from "next/link";
import { myAgencies } from "@/lib/api.js";

export default async function AgencyHome() {
  const agencies = await myAgencies();
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">
        Hailing · Agency Portal
      </p>
      <h1 className="mt-2 text-4xl font-bold text-brand-900">Your agencies</h1>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {agencies.map((agency) => (
          <Link
            key={agency.id}
            href={`/agencies/${agency.id}`}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-brand-500"
          >
            <h2 className="text-lg font-semibold">{agency.name}</h2>
            <p className="mt-1 font-mono text-xs text-slate-500">
              {agency.slug}
            </p>
            <p className="mt-3 inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
              Open driver board
            </p>
          </Link>
        ))}
        {agencies.length === 0 && (
          <p className="text-slate-600">
            No agency memberships on this account yet.
          </p>
        )}
      </div>
    </main>
  );
}
