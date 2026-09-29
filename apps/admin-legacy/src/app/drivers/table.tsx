"use client";

import { canGoOnline } from "@/lib/compliance";
import type { Driver } from "@/lib/types";
import { Badge, Btn, Card } from "../ui";
import { setOpsDriverStatusAction } from "./actions";

const statusTone = (s: Driver["status"]) =>
  s === "online" ? "ok" : s === "approved" ? "info" : s === "pending" ? "warn" : "neutral";

export function OpsDriverTable({
  initial,
  prev,
  next,
  safe,
  pages,
  total,
}: {
  initial: Driver[];
  prev: string;
  next: string;
  safe: number;
  pages: number;
  total: number;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card flush>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2">Driver</th>
                <th className="px-4 py-2">Vehicle</th>
                <th className="px-4 py-2">Agency</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">PA / CPC</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {initial.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-zinc-500">
                    No drivers match.
                  </td>
                </tr>
              )}
              {initial.map((d) => (
                <tr key={d.id} className="hover:bg-zinc-50/60">
                  <td className="px-4 py-2">
                    <a href={`/fleet/drivers/${d.id}`} className="font-medium underline">
                      {d.name}
                    </a>
                    <p className="text-xs text-zinc-500 tabular-nums">{d.phone}</p>
                  </td>
                  <td className="px-4 py-2">
                    {d.vehicleType} · {d.plateNo}
                  </td>
                  <td className="px-4 py-2 text-xs">{d.agencyName ?? "—"}</td>
                  <td className="px-4 py-2">
                    <Badge tone={statusTone(d.status)}>{d.status}</Badge>
                  </td>
                  <td className="px-4 py-2 text-xs tabular-nums">
                    {d.docs.paExpiry} / {d.docs.cpcExpiry}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-2">
                      <Btn tone="primary" onClick={() => setOpsDriverStatusAction(d.id, "approved")}>
                        Approve
                      </Btn>
                      <Btn
                        disabled={!canGoOnline(d).ok}
                        title={canGoOnline(d).reason ?? "Compliant"}
                        onClick={() => setOpsDriverStatusAction(d.id, "online")}
                      >
                        Go online
                      </Btn>
                      <Btn tone="danger" onClick={() => setOpsDriverStatusAction(d.id, "suspended")}>
                        Suspend
                      </Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-2 text-sm">
          <a
            href={`/drivers?${prev}`}
            aria-disabled={safe <= 1}
            className={safe <= 1 ? "pointer-events-none text-zinc-300" : "underline"}
          >
            ← Prev
          </a>
          <span className="text-xs text-zinc-500 tabular-nums">
            Page {safe} of {pages} · {total} total
          </span>
          <a
            href={`/drivers?${next}`}
            aria-disabled={safe >= pages}
            className={safe >= pages ? "pointer-events-none text-zinc-300" : "underline"}
          >
            Next →
          </a>
        </div>
      </Card>
    </div>
  );
}
