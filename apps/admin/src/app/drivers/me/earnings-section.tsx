"use client";

import { useState } from "react";
import { inPeriod, summarizeTrips, type EarningsPeriod } from "@/lib/earnings";
import type { AgencyTrip } from "@/lib/earnings";
import { Btn, Card } from "../../ui";

const PERIODS: EarningsPeriod[] = ["today", "week", "all"];

export function EarningsSection({ trips }: { trips: AgencyTrip[] }) {
  const [period, setPeriod] = useState<EarningsPeriod>("today");
  const shown = inPeriod(trips, period);
  const s = summarizeTrips(shown);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        {PERIODS.map((p) => (
          <Btn key={p} tone={period === p ? "primary" : "dark"} onClick={() => setPeriod(p)}>
            {p === "today" ? "Today" : p === "week" ? "7 days" : "All"}
          </Btn>
        ))}
        <a href="/drivers/me/trips" className="ml-auto text-xs underline">
          Full history
        </a>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          ["Rides done", s.rides],
          ["Gross", `₱${s.gross}`],
          ["My net (85%)", `₱${s.net}`],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
            <p className="mt-1 font-sans text-2xl font-bold tabular-nums">{value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
