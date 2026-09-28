"use client";

import { createUserAction } from "./actions";
import { ROLES, type Role } from "@/lib/access";
import type { TeamUser } from "@/lib/users";
import { Badge, Btn, Card, Field, inputCls } from "../ui";

export function UserTable({
  initial,
  prev,
  next,
  safe,
  pages,
  total,
}: {
  initial: TeamUser[];
  prev: string;
  next: string;
  safe: number;
  pages: number;
  total: number;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <form action={createUserAction} className="flex flex-wrap items-end gap-3">
          <Field label="Name">
            <input name="name" required placeholder="Ops Lead" className={inputCls} />
          </Field>
          <Field label="Email">
            <input
              name="email"
              type="email"
              required
              placeholder="ops@hatod.co"
              className={inputCls}
            />
          </Field>
          <Field label="Phone (OTP login)">
            <input
              name="phone"
              required
              inputMode="tel"
              placeholder="09171110011"
              className={inputCls}
            />
          </Field>
          <Field label="Role">
            <select name="role" defaultValue="operations" className={inputCls}>
              {ROLES.map((r: Role) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
          <Btn tone="primary" type="submit">
            Add user
          </Btn>
        </form>
      </Card>
      <Card flush>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2">User</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {initial.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50/60">
                  <td className="px-4 py-2">
                    <a href={`/users/${u.id}`} className="font-medium underline">
                      {u.name}
                    </a>
                    <p className="text-xs text-zinc-500">{u.email}</p>
                    {!u.active && (
                      <p>
                        <Badge tone="bad">suspended</Badge>
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <Badge tone={u.role === "superadmin" ? "info" : "neutral"}>
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
                    <a href={`/users/${u.id}`} className="underline">
                      Open →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-2 text-sm">
          <a
            href={`/users?${prev}`}
            aria-disabled={safe <= 1}
            className={safe <= 1 ? "pointer-events-none text-zinc-300" : "underline"}
          >
            ← Prev
          </a>
          <span className="text-xs text-zinc-500 tabular-nums">
            Page {safe} of {pages} · {total} total
          </span>
          <a
            href={`/users?${next}`}
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
