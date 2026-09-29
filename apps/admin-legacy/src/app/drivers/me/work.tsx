"use client";

import { nextActions } from "@/lib/tripflow";
import type { Trip } from "@/lib/types";
import { Badge, Btn, Card, PageHeader } from "../../ui";
import { AutoRefresh } from "../../auto-refresh";
import { acceptOfferAction, advanceTripAction } from "./actions";

const ACTION_LABELS: Record<string, string> = {
  ACCEPTED: "Accept",
  ARRIVED: "I've arrived",
  IN_PROGRESS: "Start trip",
  COMPLETED: "Complete",
  CANCELLED: "Cancel",
};

function navLinks(pickup: string, dropoff: string) {
  const g = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dropoff)}&origin=${encodeURIComponent(pickup)}`;
  const w = `https://waze.com/ul?q=${encodeURIComponent(pickup)}`;
  return { g, w };
}

export function TripWork({
  active,
  offers,
}: {
  active: Trip | null;
  offers: Trip[];
}) {
  const links = active ? navLinks(active.pickup, active.dropoff) : null;
  return (
    <div className="flex flex-col gap-4">
      <AutoRefresh />
      <PageHeader title="Today's work" />
      <Card>
        <h2 className="mb-2 font-semibold">Current trip</h2>
        {!active ? (
          <p className="text-sm text-zinc-500">No active trip — grab an offer below.</p>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm">
              <span className="font-medium">{active.pickup}</span> → {active.dropoff}
            </p>
            <p className="text-xs text-zinc-500 tabular-nums">
              {active.riderName} · ₱{active.fareQuote} {active.payment} · {active.status}
            </p>
            <div className="flex flex-wrap gap-2">
              {nextActions(active.status).map((to) => (
                <Btn
                  key={to}
                  tone={to === "CANCELLED" ? "danger" : "primary"}
                  onClick={() => advanceTripAction(active.id, to)}
                >
                  {ACTION_LABELS[to] ?? to}
                </Btn>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <a href={links!.g} target="_blank" rel="noreferrer" className="underline">
                Navigate with Maps
              </a>
              <a href={links!.w} target="_blank" rel="noreferrer" className="underline">
                Navigate with Waze
              </a>
            </div>
          </div>
        )}
      </Card>
      <Card>
        <div className="mb-2 flex items-center gap-2">
          <h2 className="font-semibold">Open offers</h2>
          <Badge tone={offers.length > 0 ? "info" : "neutral"}>{offers.length}</Badge>
        </div>
        {offers.length === 0 ? (
          <p className="text-sm text-zinc-500">No open offers right now.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {offers.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between gap-2 border-t border-zinc-100 pt-2 text-sm first:border-0 first:pt-0"
              >
                <span>
                  {o.pickup} → {o.dropoff}
                  <span className="block text-xs text-zinc-500 tabular-nums">
                    ₱{o.fareQuote} {o.payment}
                  </span>
                </span>
                <Btn tone="primary" onClick={() => acceptOfferAction(o.id)}>
                  Accept
                </Btn>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
