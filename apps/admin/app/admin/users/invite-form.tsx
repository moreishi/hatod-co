"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminRole } from "@hailing/constants";

export function InviteForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>(AdminRole.OPS);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function invite() {
    setError(null);
    setResult(null);
    const res = await fetch("/api/admin/invitations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const body = (await res.json()) as { token?: string; message?: string };
    if (!res.ok) {
      setError(body.message ?? "invite failed");
      return;
    }
    setResult(`Invitation created — share this link: /invite/${body.token}`);
    setEmail("");
    router.refresh();
  }

  return (
    <div className="mt-3 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <label className="text-sm font-medium">
        Email
        <input
          className="mt-1 rounded-lg border border-slate-300 px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ops@example.com"
        />
      </label>
      <label className="text-sm font-medium">
        Role
        <select
          className="mt-1 rounded-lg border border-slate-300 px-3 py-2"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          {Object.values(AdminRole).map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <button
        className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        onClick={invite}
        disabled={!email}
      >
        Invite
      </button>
      {result && (
        <p className="w-full font-mono text-xs text-emerald-700">{result}</p>
      )}
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </div>
  );
}
