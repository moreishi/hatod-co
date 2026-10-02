"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { VehicleType } from "@hailing/constants";
import { Button } from "@/components/ui/button.js";
import { Card } from "@/components/ui/card.js";
import { Input } from "@/components/ui/input.js";
import { Label } from "@/components/ui/label.js";

export interface FleetDriver {
  id: string;
  status: string;
  user: { displayName: string };
}

export interface FleetVehicle {
  id: string;
  plateNo: string;
  type: string;
  assignments: { driver: { user: { displayName: string } } }[];
}

export function FleetPanel({
  agencyId,
  vehicles,
  drivers,
}: {
  agencyId: string;
  vehicles: FleetVehicle[];
  drivers: FleetDriver[];
}) {
  const router = useRouter();
  const [plateNo, setPlateNo] = useState("");
  const [type, setType] = useState<string>(VehicleType.MOTORCYCLE);
  const [assignDriver, setAssignDriver] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

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
    <div>
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-2">
          <Label htmlFor="fleet-plate">Plate no.</Label>
          <Input
            id="fleet-plate"
            value={plateNo}
            onChange={(e) => setPlateNo(e.target.value.toUpperCase())}
            placeholder="GAK 1234"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="fleet-type">Type</Label>
          <select
            id="fleet-type"
            className="flex h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {Object.values(VehicleType).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <Button
          disabled={!plateNo}
          onClick={() =>
            post(`/api/admin/agencies/${agencyId}/vehicles`, {
              plateNo,
              type,
            })
          }
        >
          Add vehicle
        </Button>
      </div>
      <Card className="mt-4 overflow-hidden p-0">
        <ul className="divide-y">
          {vehicles.map((vehicle) => (
            <li
              key={vehicle.id}
              className="flex flex-wrap items-center justify-between gap-3 px-6 py-3"
            >
              <div>
                <p className="font-medium">
                  {vehicle.plateNo} · {vehicle.type}
                </p>
                <p className="text-xs text-slate-500">
                  {vehicle.assignments[0]
                    ? `driven by ${vehicle.assignments[0].driver.user.displayName}`
                    : "unassigned — drivers without a vehicle get no offers"}
                </p>
              </div>
              <div className="flex gap-2">
                <select
                  className="rounded-lg border border-input bg-background px-2 py-1 text-xs"
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
                    post("/api/admin/agencies/assign", {
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
          {vehicles.length === 0 && (
            <li className="px-6 py-4 text-sm text-slate-500">
              No vehicles yet — register the first one above.
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
