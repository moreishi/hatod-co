"use client";

import { useState } from "react";
import { drivers as seed } from "@/lib/seed";
import { canGoOnline } from "@/lib/compliance";
import type { DriverStatus } from "@/lib/types";
import { Badge, Btn, Card, PageHeader } from "../ui";

const statusTone = (s: DriverStatus) =>
  s === "online" ? "ok" : s === "approved" ? "info" : s === "pending" ? "warn" : "neutral";

export default function DriversPage() {
  const [drivers, setDrivers] = useState(seed);

  function setStatus(id: string, status: DriverStatus) {
    setDrivers((ds) => ds.map((d) => (d.id === id ? { ...d, status } : d)));
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Fleet — approval & status" />
      <Card flush>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2">Driver</th>
                <th className="px-4 py-2">Vehicle</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">PA / CPC</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {drivers.map((d) => (
                <tr key={d.id} className="hover:bg-zinc-50/60">
                  <td className="px-4 py-2">
                    <p className="font-medium">{d.name}</p>
                    <p className="text-xs text-zinc-500">{d.phone}</p>
                  </td>
                  <td className="px-4 py-2">
                    {d.vehicleType} · {d.plateNo}
                  </td>
                  <td className="px-4 py-2">
                    <Badge tone={statusTone(d.status)}>{d.status}</Badge>
                  </td>
                  <td className="px-4 py-2 text-xs tabular-nums">
                    {d.docs.paExpiry} / {d.docs.cpcExpiry}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-2">
                      <Btn tone="primary" onClick={() => setStatus(d.id, "approved")}>
                        Approve
                      </Btn>
                      <Btn
                        disabled={!canGoOnline(d).ok}
                        title={canGoOnline(d).reason ?? "Compliant"}
                        onClick={() => setStatus(d.id, "online")}
                      >
                        Go online
                      </Btn>
                      <Btn tone="danger" onClick={() => setStatus(d.id, "suspended")}>
                        Suspend
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
