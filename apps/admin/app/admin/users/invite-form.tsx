"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminRole } from "@hailing/constants";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Label } from "@/components/ui/label.js";

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
      <div className="grid gap-2">
        <Label htmlFor="invite-email">Email</Label>
        <Input
          id="invite-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ops@example.com"
        />
      </div>
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
      <Button onClick={invite} disabled={!email}>
        Invite
      </Button>
      {result && (
        <p className="w-full font-mono text-xs text-emerald-700">{result}</p>
      )}
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </div>
  );
}
