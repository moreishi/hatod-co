"use client";

import { useMemo, useState } from "react";
import { calculateFare } from "@/lib/fare";
import type { Zone } from "@/lib/types";
import { Badge, Btn, Card, Field, PageHeader, inputCls } from "../ui";
import { updateZonePricingAction } from "./actions";

export function ZonesEditor({ initial }: { initial: Zone[] }) {
  const [zones, setZones] = useState(initial);
  const [km, setKm] = useState(5);
  const [min, setMin] = useState(12);
  const [saved, setSaved] = useState<Record<string, string>>({});

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

  function edit(id: string, key: "base" | "perKm" | "perMin" | "minimum", value: number) {
    setZones((zs) =>
      zs.map((z) => (z.id === id ? { ...z, pricing: { ...z.pricing, [key]: value } } : z)),
    );
    setSaved((m) => {
      const next = { ...m };
      delete next[id];
      return next;
    });
  }

  async function save(id: string) {
    const z = zones.find((x) => x.id === id);
    if (!z) return;
    try {
      await updateZonePricingAction(id, z.pricing);
      setSaved((m) => ({ ...m, [id]: "Saved." }));
    } catch (e) {
      setSaved((m) => ({ ...m, [id]: e instanceof Error ? e.message : "Save failed." }));
    }
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
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">{z.name}</h2>
            <div className="flex items-center gap-2">
              {saved[z.id] && <span className="text-xs text-zinc-500">{saved[z.id]}</span>}
              <Btn tone="primary" onClick={() => save(z.id)}>
                Save
              </Btn>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
            {(["base", "perKm", "perMin", "minimum"] as const).map((k) => (
              <Field key={k} label={k}>
                <input
                  type="number"
                  value={z.pricing[k]}
                  min={0}
                  onChange={(e) => edit(z.id, k, Number(e.target.value))}
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
