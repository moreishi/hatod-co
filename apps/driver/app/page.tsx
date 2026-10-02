import Link from "next/link";
import { myRides } from "@/lib/api.js";
import { LogoutButton } from "./logout-button.js";
import { OnlineToggle } from "./online-toggle.js";

const ACTIVE_STATES = [
  "ASSIGNED",
  "DRIVER_EN_ROUTE",
  "DRIVER_ARRIVED",
  "IN_PROGRESS",
];

export default async function DriverHome() {
  const { asDriver } = await myRides();
  const current =
    asDriver.find((r) => ACTIVE_STATES.includes(r.status)) ?? null;
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">
          Hailing A� Driver
        </p>
        <LogoutButton />
      </div>
      <h1 className="mt-2 text-4xl font-bold text-brand-900">
        Ready to drive?
      </h1>
      <div className="mt-6">
        <OnlineToggle />
      </div>
      {current ? (
        <Link
          href={`/rides/${current.id}`}
          className="mt-6 block rounded-2xl border border-brand-500 bg-white p-6 shadow-sm"
        >
          <p className="text-sm text-slate-500">
            Current ride · {current.status}
          </p>
          <p className="mt-1 text-lg font-semibold">
            {current.pickupLabel} → {current.dropoffLabel}
          </p>
          <p className="mt-1 font-mono text-sm">
            ₱{(current.fareCentavos / 100).toFixed(2)}
          </p>
        </Link>
      ) : (
        <p className="mt-6 text-slate-600">
          No active ride. Stay online and assignments will appear here.
        </p>
      )}
      <h2 className="mt-10 font-semibold">Recent</h2>
      <ul className="mt-3 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
        {asDriver.slice(0, 10).map((ride) => (
          <li key={ride.id}>
            <Link
              href={`/rides/${ride.id}`}
              className="flex justify-between px-6 py-3"
            >
              <span className="text-sm">
                {ride.pickupLabel} → {ride.dropoffLabel}
              </span>
              <span className="font-mono text-xs text-slate-500">
                {ride.status}
              </span>
            </Link>
          </li>
        ))}
        {asDriver.length === 0 && (
          <li className="px-6 py-4 text-sm text-slate-500">No rides yet.</li>
        )}
      </ul>
    </main>
  );
}
