"use client";

import { canBook } from "@/lib/rider";
import type { Rider } from "@/lib/types";
import { Badge, Btn, Card, Field, PageHeader, inputCls } from "../../ui";
import { bookMyTripAction } from "./actions";

export function RiderHome({
  profile,
  balanceCents,
  zones,
}: {
  profile: Rider;
  balanceCents: number;
  zones: { id: string; name: string }[];
}) {
  const gate = canBook(profile);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={`Hi, ${profile.name.split(" ")[0]}`}
        badge={<Badge tone={gate.ok ? "ok" : "bad"}>{gate.ok ? "can book" : "suspended"}</Badge>}
      />
      <Card>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Wallet balance</p>
        <p className="mt-1 font-sans text-3xl font-bold tabular-nums">
          ₱{(balanceCents / 100).toFixed(2)}
        </p>
        <p className="mt-1 text-xs text-zinc-500">Top-ups happen at agency or ops counters.</p>
      </Card>
      <Card>
        <h2 className="mb-2 font-semibold">Book a ride (cash, wallet-backed)</h2>
        {!gate.ok ? (
          <p className="text-sm text-red-600">Booking blocked: {gate.reason}.</p>
        ) : (
          <form
            action={bookMyTripAction}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            <Field label="Zone">
              <select name="zoneId" required defaultValue={zones[0]?.id ?? ""} className={inputCls}>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Pickup">
              <input name="pickup" required placeholder="SM Gensan" className={inputCls} />
            </Field>
            <Field label="Dropoff">
              <input name="dropoff" required placeholder="Lagao Market" className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Distance (m)">
                <input name="distanceM" type="number" required min={1} defaultValue={4200} className={inputCls} />
              </Field>
              <Field label="Duration (s)">
                <input name="durationS" type="number" required min={1} defaultValue={720} className={inputCls} />
              </Field>
            </div>
            <div className="flex items-end sm:col-span-2">
              <Btn tone="primary" type="submit">
                Request ride
              </Btn>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
