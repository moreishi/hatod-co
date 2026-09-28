"use client";

import { useState } from "react";
import { drivers as seed } from "@/lib/seed";
import { canGoOnline } from "@/lib/compliance";
import type { DriverStatus } from "@/lib/types";

export default function DriversPage() {
  const [drivers, setDrivers] = useState(seed);

  function setStatus(id: string, status: DriverStatus) {
    setDrivers((ds) => ds.map((d) => (d.id === id ? { ...d, status } : d)));
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Fleet — approval & status</h1>
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500">
            <tr>
              <th className="px-4 py-2">Driver</th>
              <th className="px-4 py-2">Vehicle</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">PA / CPC</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="px-4 py-2">
                  <p className="font-medium">{d.name}</p>
                  <p className="text-xs text-zinc-500">{d.phone}</p>
                </td>
                <td className="px-4 py-2">
                  {d.vehicleType} · {d.plateNo}
                </td>
                <td className="px-4 py-2">{d.status}</td>
                <td className="px-4 py-2 text-xs">
                  {d.docs.paExpiry} / {d.docs.cpcExpiry}
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded bg-green-600 px-2 py-1 text-xs text-white"
                      onClick={() => setStatus(d.id, "approved")}
                    >
                      Approve
                    </button>
                    <button
                      className="rounded bg-zinc-700 px-2 py-1 text-xs text-white disabled:opacity-40"
                      disabled={!canGoOnline(d).ok}
                      title={canGoOnline(d).reason ?? "Compliant"}
                      onClick={() => setStatus(d.id, "online")}
                    >
                      Go online
                    </button>
                    <button
                      className="rounded bg-red-600 px-2 py-1 text-xs text-white"
                      onClick={() => setStatus(d.id, "suspended")}
                    >
                      Suspend
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
