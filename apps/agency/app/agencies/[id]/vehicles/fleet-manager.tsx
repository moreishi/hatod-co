"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { VehicleType } from "@hailing/constants";
import { Button } from "@/components/ui/button.js";
import { Card } from "@/components/ui/card.js";
import { Input } from "@/components/ui/input.js";
import type { DriverDto, VehicleDto } from "@/lib/api.js";

export function FleetManager({
  agencyId,
  vehicles,
  drivers,
}: {
  agencyId: string;
  vehicles: VehicleDto[];
  drivers: DriverDto[];
}) {
  const router = useRouter();
  const [plateNo, setPlateNo] = useState("");
  const [type, setType] = useState<string>(VehicleType.MOTORCYCLE);
  const [assignDriver, setAssignDriver] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visible = q
    ? vehicles.filter((v) =>
        [v.plateNo, v.type, v.assignments[0]?.driver.user.displayName ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
    : vehicles;

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
    setPlateNo("");
    router.refresh();
  }

  const actives = drivers.filter((d) => d.status === "ACTIVE");

  return (
    <div className="mt-8">
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <Card className="p-4">
        <h2 className="font-semibold">Register vehicle</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <Input
            className="w-40"
            placeholder="Plate no."
            value={plateNo}
            onChange={(e) => setPlateNo(e.target.value.toUpperCase())}
          />
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {Object.values(VehicleType).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <Button
            disabled={!plateNo}
            onClick={() =>
              post("/api/agency/vehicles", { agencyId, plateNo, type })
            }
          >
            Add
          </Button>
        </div>
      </Card>
      <div className="mt-6 max-w-sm">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search plate, type, or driver…"
        />
      </div>
      <Card className="mt-3 overflow-hidden p-0">
        <ul className="divide-y">
          {visible.map((vehicle) => (
            <li
              key={vehicle.id}
              className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
            >
              <div>
                <p className="font-medium">
                  {vehicle.plateNo} · {vehicle.type}
                </p>
                <p className="text-xs text-slate-500">
                  {vehicle.assignments[0]
                    ? `driven by ${vehicle.assignments[0].driver.user.displayName}`
                    : "unassigned"}
                </p>
              </div>
              <div className="flex gap-2">
                <select
                  className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                  value={assignDriver[vehicle.id] ?? ""}
                  onChange={(e) =>
                    setAssignDriver((m) => ({
                      ...m,
                      [vehicle.id]: e.target.value,
                    }))
                  }
                >
                  <option value="">assign driver…</option>
                  {actives.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.user.displayName}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!assignDriver[vehicle.id]}
                  onClick={() =>
                    post("/api/agency/vehicles/assign", {
                      driverId: assignDriver[vehicle.id],
                      vehicleId: vehicle.id,
                    })
                  }
                >
                  Assign
                </Button>
              </div>
            </li>
          ))}
          {visible.length === 0 && (
            <li className="px-6 py-4 text-sm text-slate-500">
              {vehicles.length === 0
                ? "No vehicles yet — register the first one above."
                : `No vehicles match “${query.trim()}”. Clear the search to see all.`}
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
