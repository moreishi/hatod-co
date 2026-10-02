"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button.js";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.js";
import { Input } from "@/components/ui/input.js";
import type { AgencyDto } from "@/lib/api.js";

export function AgencyRow({ agency }: { agency: AgencyDto }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [contactPhone, setContactPhone] = useState(agency.contactPhone);
  const [cityCode, setCityCode] = useState(agency.cityCode);
  const [confirming, setConfirming] = useState<null | "SUSPENDED" | "ACTIVE">(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(patch: object) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/agencies/${agency.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(body.message ?? "save failed");
        return false;
      }
      router.refresh();
      return true;
    } finally {
      setBusy(false);
    }
  }

  const suspended = agency.status !== "ACTIVE";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">
            {agency.name}{" "}
            <span className="font-mono text-xs text-slate-500">
              {agency.slug}
            </span>
          </p>
          {editing ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <Input
                className="w-36"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="Contact phone"
              />
              <Input
                className="w-32"
                value={cityCode}
                onChange={(e) => setCityCode(e.target.value)}
                placeholder="City code"
              />
            </div>
          ) : (
            <p className="font-mono text-xs text-slate-500">
              {agency.contactPhone} · {agency.cityCode}
            </p>
          )}
        </div>
        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="font-mono text-xs text-slate-500">
            {agency.status}
          </span>
          {editing ? (
            <>
              <Button
                size="sm"
                disabled={busy}
                onClick={async () => {
                  const ok = await save({ contactPhone, cityCode });
                  if (ok) setEditing(false);
                }}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(false)}
              >
                Back
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(true)}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant={suspended ? "default" : "destructive"}
                onClick={() =>
                  setConfirming(suspended ? "ACTIVE" : "SUSPENDED")
                }
              >
                {suspended ? "Activate" : "Suspend"}
              </Button>
            </>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
        title={suspended ? "Activate this agency?" : "Suspend this agency?"}
        description={
          suspended
            ? "It returns to the onboarding picker and matching immediately."
            : "It leaves the onboarding picker at once. Existing trips are unaffected."
        }
        confirmLabel={suspended ? "Activate" : "Suspend"}
        destructive={!suspended}
        busy={busy}
        onConfirm={async () => {
          if (!confirming) return;
          const ok = await save({ status: confirming });
          if (ok) setConfirming(null);
        }}
      />
    </>
  );
}

// Row content only — the list item wrapper lives in the parent page.
