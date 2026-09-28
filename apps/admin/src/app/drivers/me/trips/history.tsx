"use client";

import { useState } from "react";
import { filterTrips, type TripFilter } from "@/lib/tripflow";
import type { AgencyTrip } from "@/lib/earnings";
import { Badge, Btn, Card, PageHeader } from "../../../ui";

const TABS: TripFilter[] = ["active", "done", "all"];

export function TripHistory({ initial }: { initial: AgencyTrip[] }) {
  const [tab, setTab] = useState<TripFilter>("active");
  const shown = filterTrips(initial, tab);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="My trips"
        badge={<Badge tone="info">{shown.length}</Badge>}
      />
      <div className="flex items-center gap-2">
        {TABS.map((t) => (
          <Btn key={t} tone={tab === t ? "primary" : "dark"} onClick={() => setTab(t)}>
            {t === "active" ? "Active" : t === "done" ? "Done" : "All"}
          </Btn>
        ))}
      </div>
      <Card flush>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2">Route</th>
                <th className="px-4 py-2">Fare</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {shown.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-sm text-zinc-500">
                    Nothing here.
                  </td>
                </tr>
              )}
              {shown.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-50/60">
                  <td className="px-4 py-2">
                    {t.pickup} → {t.dropoff}
                    <span className="block text-xs text-zinc-500 tabular-nums">
                      {t.riderName} · {t.payment}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-semibold tabular-nums">₱{t.fareQuote}</td>
                  <td className="px-4 py-2">
                    <Badge tone={t.status === "COMPLETED" ? "ok" : t.status === "CANCELLED" ? "neutral" : "info"}>
                      {t.status}
                    </Badge>
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
