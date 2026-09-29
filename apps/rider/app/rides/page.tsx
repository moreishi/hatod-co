import Link from "next/link";
import { myRides } from "@/lib/api.js";

export default async function MyRidesPage() {
  const { asRider } = await myRides();
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold">My rides</h1>
      <ul className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
        {asRider.map((ride) => (
          <li key={ride.id}>
            <Link
              href={`/rides/${ride.id}`}
              className="flex items-center justify-between px-6 py-4"
            >
              <span>
                {ride.pickupLabel} → {ride.dropoffLabel}
              </span>
              <span className="font-mono text-xs text-slate-500">
                {ride.status}
              </span>
            </Link>
          </li>
        ))}
        {asRider.length === 0 && (
          <li className="px-6 py-4 text-sm text-slate-500">No rides yet.</li>
        )}
      </ul>
    </main>
  );
}
