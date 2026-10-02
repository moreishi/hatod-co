"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button.js";

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
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => act("accept")}
          >
            Accept
          </Button>
          <Button
            variant="outline"
            className="border-red-300 text-red-700 hover:text-red-700"
            onClick={() => act("reject")}
          >
            Reject
          </Button>
        </>
      )}
      {next.map((to) => (
        <Button key={to} onClick={() => act("transition", to)}>
          → {to}
        </Button>
      ))}
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </div>
  );
}
