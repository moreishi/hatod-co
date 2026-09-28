"use client";

import { useMemo, useState } from "react";
import { zones as seed } from "@/lib/seed";
import { calculateFare } from "@/lib/fare";

export default function ZonesPage() {
  const [zones, setZones] = useState(seed);
  const [km, setKm] = useState(5);
  const [min, setMin] = useState(12);

  const previews = useMemo(
    () =>
      zones.map((z) => ({
        id: z.id,
        name: z.name,
        fare: calculateFare({
          distanceM: km * 1000,
          durationS: min * 60,
          pricing: z.pricing,
        }),
      })),
    [zones, km, min],
  );

  function update(id: string, key: "base" | "perKm" | "perMin" | "minimum", value: number) {
    setZones((zs) =>
      zs.map((z) => (z.id === id ? { ...z, pricing: { ...z.pricing, [key]: value } } : z)),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Zones & fares — Gensan</h1>
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold">Fare preview</h2>
        <div className="flex gap-4 text-sm">
          <label>
            Km{" "}
            <input
              type="number"
              value={km}
              min={0}
              onChange={(e) => setKm(Number(e.target.value))}
              className="w-20 rounded border px-2 py-1"
            />
          </label>
          <label>
            Min{" "}
            <input
              type="number"
              value={min}
              min={0}
              onChange={(e) => setMin(Number(e.target.value))}
              className="w-20 rounded border px-2 py-1"
            />
          </label>
        </div>
        <ul className="mt-2 text-sm">
          {previews.map((p) => (
            <li key={p.id}>
              {p.name}: <strong>₱{p.fare}</strong>
            </li>
          ))}
        </ul>
      </div>
      {zones.map((z) => (
        <div key={z.id} className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold">{z.name}</h2>
          <div className="mt-2 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
            {(["base", "perKm", "perMin", "minimum"] as const).map((k) => (
              <label key={k} className="flex flex-col gap-1">
                {k}
                <input
                  type="number"
                  value={z.pricing[k]}
                  min={0}
                  onChange={(e) => update(z.id, k, Number(e.target.value))}
                  className="rounded border px-2 py-1"
                />
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
