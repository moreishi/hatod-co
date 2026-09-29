"use client";

import { canGoOnline } from "@/lib/compliance";
import type { Driver } from "@/lib/types";
import { Badge, Btn, Card, PageHeader } from "../../ui";
import { setMyStatusAction } from "./actions";

export function DriverHome({
  profile,
  agencyName,
}: {
  profile: Driver;
  agencyName: string | null;
}) {
  const gate = canGoOnline(profile);
  const online = profile.status === "online";
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={`Hi, ${profile.name.split(" ")[0]}`}
        badge={<Badge tone={online ? "ok" : "neutral"}>{profile.status}</Badge>}
      />
      <Card>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">My agency</p>
        <p className="mt-1 font-sans text-xl font-bold">
          {agencyName ?? "Unassigned — contact operations"}
        </p>
      </Card>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <p className="font-medium">
              {profile.vehicleType} · {profile.plateNo}
            </p>
            <p className="text-xs text-zinc-500 tabular-nums">{profile.phone}</p>
          </div>
          <Btn
            tone={online ? "dark" : "primary"}
            disabled={!online && !gate.ok}
            title={!online && !gate.ok ? (gate.reason ?? "Not compliant") : undefined}
            onClick={() => setMyStatusAction(online ? "offline" : "online")}
          >
            {online ? "Go offline" : "Go online"}
          </Btn>
        </div>
        {!gate.ok && (
          <p className="mt-2 text-xs text-amber-700">
            Offline: {gate.reason} — contact your agency to renew documents.
          </p>
        )}
      </Card>
      <Card>
        <h2 className="mb-1 font-semibold">Documents</h2>
        <ul className="text-sm">
          <li>
            PA expiry: <span className="font-medium tabular-nums">{profile.docs.paExpiry}</span>
          </li>
          <li>
            CPC expiry: <span className="font-medium tabular-nums">{profile.docs.cpcExpiry}</span>
          </li>
          <li>
            License: <span className="font-medium">{profile.docs.licenseNo}</span>
          </li>
        </ul>
        <p className="mt-2 text-xs text-zinc-500">
          <a href="/drivers/me/documents" className="underline">
            Uploads & renewals
          </a>{" "}
          live on the documents page.
        </p>
      </Card>
    </div>
  );
}
