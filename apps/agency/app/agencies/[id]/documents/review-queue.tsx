"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DocumentDto } from "@/lib/api.js";

export function ReviewQueue({
  pending,
  history,
}: {
  pending: DocumentDto[];
  history: DocumentDto[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function verdict(documentId: string, status: "VERIFIED" | "REJECTED") {
    setError(null);
    const res = await fetch("/api/agency/documents/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ documentId, status }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { message?: string };
      setError(data.message ?? "review failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-8">
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <h2 className="font-semibold">Pending ({pending.length})</h2>
      <ul className="mt-3 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
        {pending.map((doc) => (
          <li
            key={doc.id}
            className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
          >
            <div>
              <p className="font-medium">
                {doc.type} · {doc.driver?.user.displayName ?? "vehicle doc"}
              </p>
              <p className="font-mono text-xs text-slate-500">
                {doc.storageKey}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className="rounded-lg bg-emerald-600 px-3 py-1 text-sm text-white"
                onClick={() => verdict(doc.id, "VERIFIED")}
              >
                Verify
              </button>
              <button
                className="rounded-lg border border-red-300 px-3 py-1 text-sm text-red-700"
                onClick={() => verdict(doc.id, "REJECTED")}
              >
                Reject
              </button>
            </div>
          </li>
        ))}
        {pending.length === 0 && (
          <li className="px-6 py-4 text-sm text-slate-500">Queue clear.</li>
        )}
      </ul>
      <h2 className="mt-8 font-semibold">Recent decisions</h2>
      <ul className="mt-3 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
        {history.map((doc) => (
          <li key={doc.id} className="flex justify-between px-6 py-3 text-sm">
            <span>
              {doc.type} · {doc.driver?.user.displayName}
            </span>
            <span className="font-mono text-xs text-slate-500">
              {doc.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
