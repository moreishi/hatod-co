"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button.js";
import { Card } from "@/components/ui/card.js";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.js";
import { Input } from "@/components/ui/input.js";
import type { DriverDto, RideDto } from "@/lib/api.js";
import { humanStatus, humanTransition } from "@/lib/status.js";

const NEXT: Record<string, string[]> = {
  REQUESTED: [],
  NO_DRIVERS: ["CANCELLED"],
  ASSIGNED: ["DRIVER_EN_ROUTE", "CANCELLED"],
  DRIVER_EN_ROUTE: ["DRIVER_ARRIVED", "CANCELLED"],
  DRIVER_ARRIVED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
};

// NO_DRIVERS leads: unmatched rides need dispatcher rescue first.
const COLUMNS = [
  "NO_DRIVERS",
  "REQUESTED",
  "ASSIGNED",
  "DRIVER_EN_ROUTE",
  "DRIVER_ARRIVED",
  "IN_PROGRESS",
];

const ASSIGNABLE = ["REQUESTED", "NO_DRIVERS"];

export function DispatchBoard({
  rides,
  drivers,
}: {
  rides: RideDto[];
  drivers: DriverDto[];
}) {
  const router = useRouter();
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [driverId, setDriverId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = (ride: RideDto) =>
    !q ||
    [
      ride.pickupLabel,
      ride.dropoffLabel,
      ride.status,
      ride.driver?.user.displayName ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(q);

  async function post(path: string, body: unknown) {
    setError(null);
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json()) as { message?: string };
      setError(data.message ?? "action failed");
      return;
    }
    setAssignFor(null);
    router.refresh();
  }

  const assign = (rideId: string) =>
    post("/api/agency/rides/assign", { rideId, driverId });
  const transition = (rideId: string, to: string, cancelReason?: string) => {
    if (to === "CANCELLED") {
      setCancelling(rideId);
      return;
    }
    post("/api/agency/rides/transition", { rideId, to, cancelReason });
  };

  const confirmCancel = (rideId: string) => {
    setBusy(true);
    post("/api/agency/rides/transition", {
      rideId,
      to: "CANCELLED",
      cancelReason: "cancelled by dispatcher",
    }).finally(() => {
      setBusy(false);
      setCancelling(null);
    });
  };

  return (
    <div className="mt-8">
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="mb-4 max-w-sm">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search route, driver, or state…"
        />
      </div>
      <ConfirmDialog
        open={cancelling !== null}
        onOpenChange={(open) => {
          if (!open) setCancelling(null);
        }}
        title="Cancel this ride?"
        description="The rider is left without a trip — only cancel when the ride genuinely cannot run."
        confirmLabel="Cancel ride"
        destructive
        busy={busy}
        onConfirm={() => {
          if (cancelling) confirmCancel(cancelling);
        }}
      />
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {COLUMNS.map((status) => (
          <Card key={status} className="p-3">
            <h2 className="text-xs font-semibold text-slate-500" title={status}>
              {humanStatus(status)}
            </h2>
            <ul className="mt-2 space-y-2">
              {rides
                .filter((r) => r.status === status && matches(r))
                .map((ride) => (
                  <li
                    key={ride.id}
                    className="rounded-xl bg-slate-50 p-3 text-sm"
                  >
                    <p className="font-medium">
                      {ride.pickupLabel} → {ride.dropoffLabel}
                    </p>
                    <p className="font-mono text-xs text-slate-500">
                      ₱{(ride.fareCentavos / 100).toFixed(2)} ·{" "}
                      {ride.paymentMethod}
                    </p>
                    <p className="text-xs text-slate-500">
                      {ride.driver
                        ? ride.driver.user.displayName
                        : "unassigned"}
                    </p>
                    {ASSIGNABLE.includes(status) &&
                      (assignFor === ride.id ? (
                        <div className="mt-2 flex gap-2">
                          <select
                            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                            value={driverId}
                            onChange={(e) => setDriverId(e.target.value)}
                          >
                            <option value="">driver…</option>
                            {drivers.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.user.displayName} ·{" "}
                                {d.assignments[0]?.vehicle.plateNo}
                              </option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            disabled={!driverId}
                            onClick={() => assign(ride.id)}
                          >
                            Go
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="link"
                          size="sm"
                          className="mt-2 h-auto p-0"
                          onClick={() => setAssignFor(ride.id)}
                        >
                          Assign
                        </Button>
                      ))}
                    <div className="mt-1 flex flex-wrap gap-2">
                      {(NEXT[status] ?? []).map((to) => (
                        <Button
                          key={to}
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-slate-600"
                          onClick={() => transition(ride.id, to)}
                        >
                          {humanTransition(to)}
                        </Button>
                      ))}
                    </div>
                  </li>
                ))}
              {rides.filter((r) => r.status === status && matches(r)).length ===
                0 && (
                <li className="p-2 text-xs text-slate-400">
                  {q ? "no matches in this column" : "empty"}
                </li>
              )}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
