"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DriverDto, RideDto } from "@/lib/api.js";

const NEXT: Record<string, string[]> = {
  REQUESTED: [],
  ASSIGNED: ["DRIVER_EN_ROUTE", "CANCELLED"],
  DRIVER_EN_ROUTE: ["DRIVER_ARRIVED", "CANCELLED"],
  DRIVER_ARRIVED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
};

const COLUMNS = [
  "REQUESTED",
  "ASSIGNED",
  "DRIVER_EN_ROUTE",
  "DRIVER_ARRIVED",
  "IN_PROGRESS",
];

export function DispatchBoard({
  rides,
  drivers,
}: {
  rides: RideDto[];
  drivers: DriverDto[];
}) {
  const router = useRouter();
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [driverId, setDriverId] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function post(path: string, body: unknown) {
    setError(null);
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json()) as { message?: string };
      setError(data.message ?? "action failed");
      return;
    }
    setAssignFor(null);
    router.refresh();
  }

  const assign = (rideId: string) =>
    post("/api/agency/rides/assign", { rideId, driverId });
  const transition = (rideId: string, to: string, cancelReason?: string) =>
    post("/api/agency/rides/transition", { rideId, to, cancelReason });

  return (
    <div className="mt-8">
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {COLUMNS.map((status) => (
          <section
            key={status}
            className="rounded-2xl border border-slate-200 bg-white p-3"
          >
            <h2 className="font-mono text-xs font-semibold text-slate-500">
              {status}
            </h2>
            <ul className="mt-2 space-y-2">
              {rides
                .filter((r) => r.status === status)
                .map((ride) => (
                  <li
                    key={ride.id}
                    className="rounded-xl bg-slate-50 p-3 text-sm"
                  >
                    <p className="font-medium">
                      {ride.pickupLabel} → {ride.dropoffLabel}
                    </p>
                    <p className="font-mono text-xs text-slate-500">
                      ₱{(ride.fareCentavos / 100).toFixed(2)} ·{" "}
                      {ride.paymentMethod}
                    </p>
                    <p className="text-xs text-slate-500">
                      {ride.driver
                        ? ride.driver.user.displayName
                        : "unassigned"}
                    </p>
                    {status === "REQUESTED" &&
                      (assignFor === ride.id ? (
                        <div className="mt-2 flex gap-2">
                          <select
                            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                            value={driverId}
                            onChange={(e) => setDriverId(e.target.value)}
                          >
                            <option value="">driver…</option>
                            {drivers.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.user.displayName} ·{" "}
                                {d.assignments[0]?.vehicle.plateNo}
                              </option>
                            ))}
                          </select>
                          <button
                            className="rounded-lg bg-brand-700 px-2 py-1 text-xs text-white disabled:opacity-50"
                            disabled={!driverId}
                            onClick={() => assign(ride.id)}
                          >
                            Go
                          </button>
                        </div>
                      ) : (
                        <button
                          className="mt-2 text-xs font-medium text-brand-700"
                          onClick={() => setAssignFor(ride.id)}
                        >
                          Assign
                        </button>
                      ))}
                    <div className="mt-1 flex flex-wrap gap-2">
                      {(NEXT[status] ?? []).map((to) => (
                        <button
                          key={to}
                          className="text-xs font-medium text-slate-600 underline"
                          onClick={() =>
                            to === "CANCELLED"
                              ? transition(
                                  ride.id,
                                  to,
                                  "cancelled by dispatcher",
                                )
                              : transition(ride.id, to)
                          }
                        >
                          {to === "CANCELLED" ? "Cancel" : `→ ${to}`}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              {rides.filter((r) => r.status === status).length === 0 && (
                <li className="p-2 text-xs text-slate-400">empty</li>
              )}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
