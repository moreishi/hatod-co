"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button.js";
import { Card } from "@/components/ui/card.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.js";
import { Textarea } from "@/components/ui/textarea.js";
import type { DocumentDto } from "@/lib/api.js";
import { isInlineImage } from "@/lib/review.js";
import { humanDocType, humanStatus } from "@/lib/status.js";

export function ReviewQueue({ docs }: { docs: DocumentDto[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<DocumentDto | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function verdict(
    documentId: string,
    status: "VERIFIED" | "REJECTED",
    note?: string,
  ) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/agency/documents/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ documentId, status, note }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        setError(data.message ?? "review failed");
        return;
      }
      setRejectFor(null);
      setReason("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6">
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <Card className="overflow-hidden p-0">
        <ul className="divide-y">
          {docs.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-start justify-between gap-3 px-6 py-4"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {humanDocType(doc.type)} ·{" "}
                  {doc.driver?.user.displayName ?? "vehicle doc"}
                </p>
                {isInlineImage(doc.storageKey) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={doc.storageKey}
                    alt={`${doc.type} photo`}
                    className="mt-2 max-h-64 rounded-lg border border-slate-200"
                  />
                ) : (
                  <p className="font-mono text-xs text-slate-500">
                    {doc.storageKey}
                  </p>
                )}
                {doc.reviewNote && (
                  <p className="mt-1 text-xs text-slate-500">
                    Reviewer note: “{doc.reviewNote}”
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span
                  className="font-mono text-xs text-slate-500"
                  title={doc.status}
                >
                  {humanStatus(doc.status)}
                </span>
                {doc.status === "PENDING" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      disabled={busy}
                      onClick={() => verdict(doc.id, "VERIFIED")}
                    >
                      Verify
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy}
                      onClick={() => {
                        setReason("");
                        setRejectFor(doc);
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
          {docs.length === 0 && (
            <li className="px-6 py-8 text-center text-sm text-slate-500">
              Nothing here. Try a different tab, clear the search, or wait for
              drivers to submit.
            </li>
          )}
        </ul>
      </Card>
      <Dialog
        open={rejectFor !== null}
        onOpenChange={(open) => {
          if (!open) setRejectFor(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject document</DialogTitle>
            <DialogDescription>
              {rejectFor &&
                `${humanDocType(rejectFor.type)} · ${rejectFor.driver?.user.displayName ?? "vehicle doc"}`}
              . A reason is required — the driver sees it and resubmits against
              it.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What is wrong and what to fix (shown to the driver)"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectFor(null)}>
              Keep reviewing
            </Button>
            <Button
              variant="destructive"
              disabled={busy || reason.trim() === ""}
              onClick={() =>
                rejectFor && verdict(rejectFor.id, "REJECTED", reason.trim())
              }
            >
              {busy ? "Rejecting…" : "Reject document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
