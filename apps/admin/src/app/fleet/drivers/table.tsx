"use client";

import { useState } from "react";
import { canGoOnline } from "@/lib/compliance";
import { filterDrivers } from "@/lib/driverRules";
import type { Driver } from "@/lib/types";
import { Badge, Btn, Card, Field, PageHeader, inputCls } from "../../ui";
import {
  createDriverLoginAction,
  onboardDriverAction,
  setFleetDriverStatusAction,
} from "../actions";

const statusTone = (s: Driver["status"]) =>
  s === "online" ? "ok" : s === "approved" ? "info" : s === "pending" ? "warn" : "neutral";

export function FleetDrivers({ initial }: { initial: Driver[] }) {
  const [logins, setLogins] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const drivers = filterDrivers(initial, q);

  async function makeLogin(id: string) {
    const c = await createDriverLoginAction(id);
    setLogins((m) => ({ ...m, [id]: c.email }));
  }
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="My drivers" />
      <Card>
        <Field label="Search name, phone, plate, status">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, phone, plate…"
            className={inputCls}
          />
        </Field>
      </Card>
      <Card>
        <h2 className="mb-2 font-semibold">Onboard a driver</h2>
        <form action={onboardDriverAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Name">
            <input name="name" required className={inputCls} />
          </Field>
          <Field label="Phone">
            <input name="phone" required placeholder="09171110001" className={inputCls} />
          </Field>
          <Field label="Vehicle">
            <select name="vehicleType" defaultValue="moto" className={inputCls}>
              {["moto", "trike", "sedan", "suv"].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Plate no">
            <input name="plateNo" required className={inputCls} />
          </Field>
          <Field label="PA expiry">
            <input name="paExpiry" type="date" required className={inputCls} />
          </Field>
          <Field label="CPC expiry">
            <input name="cpcExpiry" type="date" required className={inputCls} />
          </Field>
          <Field label="License no">
            <input name="licenseNo" required className={inputCls} />
          </Field>
          <div className="flex items-end">
            <Btn tone="primary" type="submit">
              Add to fleet
            </Btn>
          </div>
        </form>
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
              {initial.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-zinc-500">
                    No drivers yet — onboard your first above.
                  </td>
                </tr>
              )}
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
                      <Btn
                        disabled={!canGoOnline(d).ok}
                        title={canGoOnline(d).reason ?? "Compliant"}
                        onClick={() => setFleetDriverStatusAction(d.id, "online")}
                      >
                        Go online
                      </Btn>
                      <Btn tone="danger" onClick={() => setFleetDriverStatusAction(d.id, "suspended")}>
                        Suspend
                      </Btn>
                      {!d.userId &&
                        (logins[d.id] ? (
                          <span className="rounded bg-brand-50 px-2 py-1 font-mono text-xs text-brand-700 ring-1 ring-inset ring-brand-500/20">
                            {logins[d.id]} · signs in by SMS code
                          </span>
                        ) : (
                          <Btn tone="primary" onClick={() => makeLogin(d.id)}>
                            Create login
                          </Btn>
                        ))}
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
