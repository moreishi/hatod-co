"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AcceptForm({ token }: { token: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setError(null);
    const res = await fetch(`/api/admin/invitations/${token}/accept`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });
    const body = (await res.json()) as { message?: string };
    if (!res.ok) {
      setError(body.message ?? "accept failed");
      return;
    }
    router.push("/login");
  }

  const input =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none";
  return (
    <div className="mt-8">
      <label className="text-sm font-medium">
        Phone number
        <input
          className={input}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </label>
      <label className="mt-4 block text-sm font-medium">
        Password (min 8 characters)
        <input
          className={input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button
        className="mt-4 w-full rounded-lg bg-brand-700 px-4 py-2 font-medium text-white disabled:opacity-50"
        onClick={accept}
        disabled={!phone || password.length < 8}
      >
        Activate account
      </button>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
