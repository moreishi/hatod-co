"use client";

import { useState } from "react";
import { drivers, trips as seed } from "@/lib/seed";
import type { TripStatus } from "@/lib/types";
import { Badge, Btn, Card, PageHeader, inputCls } from "../ui";

export default function TripsPage() {
  const [trips, setTrips] = useState(seed);
  const onlineDrivers = drivers.filter((d) => d.status === "online" || d.status === "approved");

  function setTrip(id: string, patch: { status?: TripStatus; driverId?: string | null }) {
    setTrips((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Live dispatch — manual fallback" />
      <Card flush>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-2">Trip</th>
              <th className="px-4 py-2">Route</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Driver</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {trips.map((t) => (
              <tr key={t.id} className="hover:bg-zinc-50/60">
                <td className="px-4 py-2">
                  <p className="font-medium tabular-nums">{t.id}</p>
                  <p className="text-xs text-zinc-500">
                    {t.riderName} · <span className="font-semibold text-zinc-700">₱{t.fareQuote}</span> {t.payment}
                  </p>
                </td>
                <td className="px-4 py-2 text-xs">
                  {t.pickup} → {t.dropoff}
                </td>
                <td className="px-4 py-2">
                  <Badge
                    tone={
                      t.status === "SEARCHING"
                        ? "warn"
                        : t.status === "IN_PROGRESS" || t.status === "ACCEPTED"
                          ? "info"
                          : t.status === "COMPLETED"
                            ? "ok"
                            : "neutral"
                    }
                  >
                    {t.status}
                  </Badge>
                </td>
                <td className="px-4 py-2">
                  <select
                    value={t.driverId ?? ""}
                    onChange={(e) =>
                      setTrip(t.id, {
                        driverId: e.target.value || null,
                        status: e.target.value ? "ACCEPTED" : t.status,
                      })
                    }
                    className={`${inputCls} text-xs`}
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
                    <Btn onClick={() => setTrip(t.id, { status: "COMPLETED" })}>
                      Complete
                    </Btn>
                    <Btn tone="danger" onClick={() => setTrip(t.id, { status: "CANCELLED" })}>
                      Cancel
                    </Btn>
                  </div>
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
