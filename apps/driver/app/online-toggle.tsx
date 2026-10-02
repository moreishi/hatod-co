"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button.js";

export function OnlineToggle() {
  const [online, setOnline] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(next: boolean) {
    setError(null);
    const res = await fetch("/api/driver/online", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ online: next }),
    });
    if (!res.ok) {
      const body = (await res.json()) as { message?: string };
      setError(body.message ?? "toggle failed");
      return;
    }
    setOnline(next);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-600">
        Status:{" "}
        <strong>
          {online === null ? "unknown" : online ? "ONLINE" : "OFFLINE"}
        </strong>
      </p>
      <div className="mt-3 flex gap-3">
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => toggle(true)}
        >
          Go online
        </Button>
        <Button variant="outline" onClick={() => toggle(false)}>
          Go offline
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
