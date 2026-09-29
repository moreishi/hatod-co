"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RideActions({
  rideId,
  status,
  accepted,
  next,
}: {
  rideId: string;
  status: string;
  accepted: boolean;
  next: string[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function act(action: "accept" | "reject" | "transition", to?: string) {
    setError(null);
    const res = await fetch("/api/ride", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rideId, action, to }),
    });
    if (!res.ok) {
      const body = (await res.json()) as { message?: string };
      setError(body.message ?? "action failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-4 flex flex-wrap gap-3">
      {status === "ASSIGNED" && !accepted && (
        <>
          <button
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white"
            onClick={() => act("accept")}
          >
            Accept
          </button>
          <button
            className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700"
            onClick={() => act("reject")}
          >
            Reject
          </button>
        </>
      )}
      {next.map((to) => (
        <button
          key={to}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm text-white"
          onClick={() => act("transition", to)}
        >
          → {to}
        </button>
      ))}
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </div>
  );
}
