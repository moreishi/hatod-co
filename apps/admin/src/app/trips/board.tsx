"use client";

import { useState } from "react";
import { filterTrips } from "@/lib/tripflow";
import type { Trip } from "@/lib/types";
import type { Driver } from "@/lib/types";
import { Badge, Btn, Card, Field, PageHeader, inputCls } from "../ui";
import { AutoRefresh } from "../auto-refresh";
import { assignTripAction, setTripStatusAction } from "./actions";

const tone = (s: Trip["status"]) =>
  s === "COMPLETED" ? "ok" : s === "CANCELLED" ? "neutral" : s === "SEARCHING" ? "warn" : "info";

export function OpsTripsBoard({ initial, drivers }: { initial: Trip[]; drivers: Driver[] }) {
  const [q, setQ] = useState("");
  const open = drivers.filter((d) => d.status === "online" || d.status === "approved");
  const trips = initial.filter((t) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return `${t.id} ${t.riderName} ${t.pickup} ${t.dropoff} ${t.status}`
      .toLowerCase()
      .includes(needle);
  });
  const searching = filterTrips(trips, "active").filter((t) => t.status === "SEARCHING").length;
  return (
    <div className="flex flex-col gap-4">
      <AutoRefresh />
      <PageHeader title="Live dispatch" badge={<Badge tone="warn">{searching} open</Badge>} />
      <Card>
        <Field label="Search id, rider, route, status">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rider, SM Gensan, SEARCHING…"
            className={inputCls}
          />
        </Field>
      </Card>
      <Card flush>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
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
              {trips.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-zinc-500">
                    No trips match.
                  </td>
                </tr>
              )}
              {trips.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-50/60">
                  <td className="px-4 py-2">
                    <p className="font-medium tabular-nums">{t.id}</p>
                    <p className="text-xs text-zinc-500">
                      {t.riderName} · <span className="font-semibold text-zinc-700">₱{t.fareQuote}</span> {t.payment}
                      {t.paid ? " · paid" : ""}
                    </p>
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {t.pickup} → {t.dropoff}
                  </td>
                  <td className="px-4 py-2">
                    <Badge tone={tone(t.status)}>{t.status}</Badge>
                  </td>
                  <td className="px-4 py-2">
                    {t.status === "SEARCHING" && !t.driverId ? (
                      <form
                        action={async (form: FormData) => {
                          await assignTripAction(t.id, String(form.get("driver") ?? ""));
                        }}
                        className="flex gap-1"
                      >
                        <select name="driver" defaultValue="" className={`${inputCls} text-xs`}>
                          <option value="">Assign…</option>
                          {open.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.vehicleType})
                            </option>
                          ))}
                        </select>
                        <Btn type="submit">Go</Btn>
                      </form>
                    ) : (
                      <span className="text-xs text-zinc-500">{t.driverId ?? "—"}</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-2">
                      <Btn onClick={() => setTripStatusAction(t.id, "COMPLETED")}>Complete</Btn>
                      <Btn tone="danger" onClick={() => setTripStatusAction(t.id, "CANCELLED")}>
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
