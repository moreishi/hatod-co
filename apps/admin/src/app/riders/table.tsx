"use client";

import {
  createRiderAction,
  deleteRiderAction,
  setRiderStatusAction,
} from "./actions";
import { canBook } from "@/lib/rider";
import type { Rider } from "@/lib/types";
import { Badge, Btn, Card, Field, inputCls } from "../ui";

export function RiderTable({ initial, live }: { initial: Rider[]; live: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <form action={createRiderAction} className="flex flex-wrap items-end gap-3">
          <Field label="Name">
            <input name="name" required placeholder="R. Garcia" className={inputCls} />
          </Field>
          <Field label="Phone">
            <input name="phone" required placeholder="+639171110011" className={inputCls} />
          </Field>
          <Field label="Email (optional)">
            <input name="email" type="email" placeholder="rider@example.ph" className={inputCls} />
          </Field>
          <Btn tone="primary" type="submit">
            Add rider
          </Btn>
          {!live && (
            <p className="w-full text-xs text-zinc-500">
              Local SQLite dev database — set DATABASE_URL for Postgres.
            </p>
          )}
        </form>
      </Card>
      <Card flush>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2">Rider</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">Account</th>
                <th className="px-4 py-2">Can book</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {initial.map((r) => {
                const gate = canBook(r);
                return (
                  <tr key={r.id} className="hover:bg-zinc-50/60">
                  <td className="px-4 py-2">
                    <p className="font-medium">{r.name}</p>
                    <p className="text-xs text-zinc-500">{r.status}</p>
                    {r.email && <p className="text-xs text-zinc-500">{r.email}</p>}
                  </td>
                    <td className="px-4 py-2 tabular-nums">{r.phone || "—"}</td>
                    <td className="px-4 py-2 text-xs">
                      {r.account ? (
                        <Badge tone="info">
                          {r.account.email} · {r.account.role}
                        </Badge>
                      ) : (
                        <span className="text-zinc-400">no account</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <Badge tone={gate.ok ? "ok" : "bad"}>
                        {gate.ok ? "Yes" : `No — ${gate.reason}`}
                      </Badge>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-2">
                        <Btn onClick={() => setRiderStatusAction(r.id, "active")}>
                          Activate
                        </Btn>
                        <Btn
                          tone="warn"
                          onClick={() => setRiderStatusAction(r.id, "suspended")}
                        >
                          Suspend
                        </Btn>
                        <Btn
                          tone="danger"
                          onClick={() =>
                            confirm(`Delete ${r.name}?`) && deleteRiderAction(r.id)
                          }
                        >
                          Delete
                        </Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
