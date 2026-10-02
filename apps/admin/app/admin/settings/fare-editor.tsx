"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button.js";
import { Card } from "@/components/ui/card.js";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.js";
import { Input } from "@/components/ui/input.js";
import { Label } from "@/components/ui/label.js";

export interface FareScheduleInput {
  name: string;
  baseFareCentavos: number;
  minimumFareCentavos: number;
  perKmCentavos: Record<string, number>;
}

const pesos = (centavos: number) => (centavos / 100).toFixed(2);

export function FareEditor({
  initial,
  activeName,
}: {
  initial: FareScheduleInput;
  activeName: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [base, setBase] = useState(String(initial.baseFareCentavos));
  const [minimum, setMinimum] = useState(String(initial.minimumFareCentavos));
  const [rates, setRates] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(initial.perKmCentavos).map(([k, v]) => [k, String(v)]),
    ),
  );
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  async function publish() {
    setError(null);
    setSaved(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/fares/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          baseFareCentavos: Number(base),
          minimumFareCentavos: Number(minimum),
          perKmCentavos: Object.fromEntries(
            Object.entries(rates).map(([k, v]) => [k, Number(v)]),
          ),
          commissionTiers: [{ minLifetimeRides: 0, rateBps: 2000 }],
        }),
      });
      const body = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(body.message ?? "publish failed");
        return;
      }
      setSaved("Published — live within 30 seconds.");
      router.refresh();
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold">Fares (PHP)</h2>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        Active schedule:{" "}
        <span className="font-mono text-xs">
          {activeName ?? "static pilot table"}
        </span>
        . Publishing creates a new version and deactivates the old one; every
        quote and booking reprices within 30 seconds.
      </p>
      <Card className="mt-3 overflow-hidden p-0">
        <ul className="divide-y">
          <li className="grid items-center gap-3 px-6 py-3 sm:grid-cols-[1fr_160px]">
            <Label htmlFor="fare-name">Schedule name</Label>
            <Input
              id="fare-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </li>
          <li className="grid items-center gap-3 px-6 py-3 sm:grid-cols-[1fr_160px]">
            <Label htmlFor="fare-base">Base fare (centavos)</Label>
            <Input
              id="fare-base"
              inputMode="numeric"
              value={base}
              onChange={(e) => setBase(e.target.value)}
            />
          </li>
          <li className="grid items-center gap-3 px-6 py-3 sm:grid-cols-[1fr_160px]">
            <Label htmlFor="fare-min">Minimum fare (centavos)</Label>
            <Input
              id="fare-min"
              inputMode="numeric"
              value={minimum}
              onChange={(e) => setMinimum(e.target.value)}
            />
          </li>
          {Object.keys(rates).map((type) => (
            <li
              key={type}
              className="grid items-center gap-3 px-6 py-3 sm:grid-cols-[1fr_160px]"
            >
              <Label htmlFor={`fare-${type}`}>
                <span className="font-mono text-xs" title={type}>
                  {type}
                </span>
              </Label>
              <Input
                id={`fare-${type}`}
                inputMode="numeric"
                value={rates[type]}
                onChange={(e) =>
                  setRates((m) => ({ ...m, [type]: e.target.value }))
                }
              />
            </li>
          ))}
        </ul>
      </Card>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {saved && <p className="mt-3 text-sm text-emerald-700">{saved}</p>}
      <div className="mt-4">
        <Button onClick={() => setConfirming(true)}>
          Publish new schedule
        </Button>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Display: base {pesos(Number(base) || 0)} · minimum{" "}
        {pesos(Number(minimum) || 0)}.
      </p>
      <ConfirmDialog
        open={confirming}
        onOpenChange={(open) => {
          if (!open) setConfirming(false);
        }}
        title="Publish these fares live?"
        description="Every quote, booking, and settlement reprices within 30 seconds. The previous schedule stays in history."
        confirmLabel="Publish fares"
        busy={busy}
        onConfirm={publish}
      />
    </section>
  );
}
