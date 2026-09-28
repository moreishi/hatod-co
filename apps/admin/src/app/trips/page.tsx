"use client";

import { useState } from "react";
import { drivers, trips as seed } from "@/lib/seed";
import type { TripStatus } from "@/lib/types";

export default function TripsPage() {
  const [trips, setTrips] = useState(seed);
  const onlineDrivers = drivers.filter((d) => d.status === "online" || d.status === "approved");

  function setTrip(id: string, patch: { status?: TripStatus; driverId?: string | null }) {
    setTrips((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Live dispatch — manual fallback</h1>
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500">
            <tr>
              <th className="px-4 py-2">Trip</th>
              <th className="px-4 py-2">Route</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Driver</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {trips.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="px-4 py-2">
                  <p className="font-medium">{t.id}</p>
                  <p className="text-xs text-zinc-500">
                    {t.riderName} · ₱{t.fareQuote} {t.payment}
                  </p>
                </td>
                <td className="px-4 py-2 text-xs">
                  {t.pickup} → {t.dropoff}
                </td>
                <td className="px-4 py-2">{t.status}</td>
                <td className="px-4 py-2">
                  <select
                    value={t.driverId ?? ""}
                    onChange={(e) =>
                      setTrip(t.id, {
                        driverId: e.target.value || null,
                        status: e.target.value ? "ACCEPTED" : t.status,
                      })
                    }
                    className="rounded border px-2 py-1 text-xs"
                  >
                    <option value="">Unassigned</option>
                    {onlineDrivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.vehicleType})
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded bg-zinc-700 px-2 py-1 text-xs text-white"
                      onClick={() => setTrip(t.id, { status: "COMPLETED" })}
                    >
                      Complete
                    </button>
                    <button
                      className="rounded bg-red-600 px-2 py-1 text-xs text-white"
                      onClick={() => setTrip(t.id, { status: "CANCELLED" })}
                    >
                      Cancel
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
