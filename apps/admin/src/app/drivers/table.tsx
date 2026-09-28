"use client";

import { useState } from "react";
import { canGoOnline } from "@/lib/compliance";
import { filterDrivers } from "@/lib/driverRules";
import type { Driver } from "@/lib/types";
import { Badge, Btn, Card, Field, PageHeader, inputCls } from "../ui";
import { setOpsDriverStatusAction } from "./actions";

const statusTone = (s: Driver["status"]) =>
  s === "online" ? "ok" : s === "approved" ? "info" : s === "pending" ? "warn" : "neutral";

export function OpsDriverTable({ initial }: { initial: Driver[] }) {
  const [q, setQ] = useState("");
  const drivers = filterDrivers(initial, q);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Fleet — approval & status" />
      <Card>
        <Field label="Search name, phone, plate, status">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Dela Cruz, MC-…, online…"
            className={inputCls}
          />
        </Field>
      </Card>
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
                    <a href={`/fleet/drivers/${d.id}`} className="font-medium underline">
                      {d.name}
                    </a>
                    <p className="text-xs text-zinc-500 tabular-nums">{d.phone}</p>
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
      </Card>
    </div>
  );
}
