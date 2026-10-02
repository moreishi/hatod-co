"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button.js";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.js";
import {
  reviewActionLabel,
  reviewActionsFor,
  type ReviewAction,
} from "@/lib/review.js";

export function DriverReviewActions({
  driverId,
  status,
}: {
  driverId: string;
  status: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<ReviewAction | null>(null);
  const actions = reviewActionsFor(status);

  async function act(action: ReviewAction) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/agency/drivers/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ driverId, action }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        setError(data.message ?? "review failed");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (actions.length === 0) return null;

  const run = (action: ReviewAction) =>
    action === "reject" || action === "suspend"
      ? setConfirming(action)
      : act(action);

  return (
    <div>
      {error && <p className="mb-2 text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        {actions.map((action) => (
          <Button
            key={action}
            size="sm"
            variant={
              action === "reject" || action === "suspend"
                ? "destructive"
                : "default"
            }
            className={
              action === "reject" || action === "suspend"
                ? undefined
                : "bg-emerald-600 hover:bg-emerald-700"
            }
            disabled={busy}
            onClick={() => run(action)}
          >
            {reviewActionLabel(action)}
          </Button>
        ))}
      </div>
      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
        title={
          confirming === "suspend"
            ? "Suspend this driver?"
            : "Reject this applicant?"
        }
        description={
          confirming === "suspend"
            ? "They stop receiving offers immediately. In-progress trips are unaffected. Reactivate anytime."
            : "They leave the pipeline and will have to contact support to appeal. This cannot be undone here."
        }
        confirmLabel={
          confirming === "suspend" ? "Suspend driver" : "Reject applicant"
        }
        destructive
        busy={busy}
        onConfirm={() => {
          if (confirming) act(confirming);
          setConfirming(null);
        }}
      />
    </div>
  );
}
