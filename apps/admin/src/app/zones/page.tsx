"use client";

import { useMemo, useState } from "react";
import { zones as seed } from "@/lib/seed";
import { calculateFare } from "@/lib/fare";
import { Badge, Card, Field, PageHeader, inputCls } from "../ui";

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
      <PageHeader title="Zones & fares — Gensan" />
      <Card>
        <h2 className="mb-2 font-semibold">Fare preview</h2>
        <div className="flex flex-wrap gap-4 text-sm">
          <Field label="Km">
            <input
              type="number"
              value={km}
              min={0}
              onChange={(e) => setKm(Number(e.target.value))}
              className={`${inputCls} w-20`}
            />
          </Field>
          <Field label="Min">
            <input
              type="number"
              value={min}
              min={0}
              onChange={(e) => setMin(Number(e.target.value))}
              className={`${inputCls} w-20`}
            />
          </Field>
        </div>
        <ul className="mt-3 flex flex-wrap gap-2 text-sm">
          {previews.map((p) => (
            <li key={p.id}>
              <Badge tone="ok">
                {p.name}: ₱{p.fare}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>
      {zones.map((z) => (
        <Card key={z.id}>
          <h2 className="font-semibold">{z.name}</h2>
          <div className="mt-2 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
            {(["base", "perKm", "perMin", "minimum"] as const).map((k) => (
              <Field key={k} label={k}>
                <input
                  type="number"
                  value={z.pricing[k]}
                  min={0}
                  onChange={(e) => update(z.id, k, Number(e.target.value))}
                  className={inputCls}
                />
              </Field>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
