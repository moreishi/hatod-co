"use client";

import { useState } from "react";
import { DOC_TYPES, type DocType, type DriverDocument } from "@/lib/documents";
import { Badge, Btn, Card, Field, PageHeader, inputCls } from "../../../ui";

const DATED: DocType[] = ["license", "or_cr", "nbi", "pnp", "insurance"];

const TYPE_LABELS: Record<DocType, string> = {
  license: "Driver's license",
  or_cr: "OR / CR",
  nbi: "NBI clearance",
  pnp: "PNP clearance",
  insurance: "Passenger insurance",
  vehicle_photo: "Vehicle photo",
};

function TypeCard({ type, docs }: { type: DocType; docs: DriverDocument[] }) {
  const rows = docs.filter((d) => d.type === type);
  const current = rows.find((d) => d.status === "verified") ?? rows[0] ?? null;

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-semibold">{TYPE_LABELS[type]}</h2>
        {current ? (
          <Badge tone={current.status === "verified" ? "ok" : current.status === "rejected" ? "bad" : "warn"}>
            {current.status}
          </Badge>
        ) : (
          <Badge tone="bad">missing</Badge>
        )}
      </div>
      {current ? (
        <div className="text-sm">
          <a
            href={`/api/driver-documents/${current.id}`}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            View latest
          </a>
          {current.expiryDate && (
            <span className="text-zinc-500 tabular-nums"> · exp {current.expiryDate}</span>
          )}
          {rows.length > 1 && (
            <p className="mt-1 text-xs text-zinc-500">
              +{rows.length - 1} older upload{rows.length > 2 ? "s" : ""} on file
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">Nothing uploaded yet.</p>
      )}
    </Card>
  );
}

function UploadCard({ driverId, onDone }: { driverId: string; onDone: () => void }) {
  const [msg, setMsg] = useState("");
  const [type, setType] = useState<DocType>("license");
  async function submit(form: FormData) {
    setMsg("Uploading…");
    form.set("driverId", driverId);
    const res = await fetch("/api/driver-documents", { method: "POST", body: form });
    const body = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Received — pending verification." : `Failed: ${body.error ?? res.status}`);
    if (res.ok) onDone();
  }
  return (
    <Card>
      <h2 className="mb-2 font-semibold">Upload or renew a document</h2>
      <form action={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Document">
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as DocType)}
            className={inputCls}
          >
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
        {DATED.includes(type) && (
          <Field label="Expiry date">
            <input name="expiryDate" type="date" required className={inputCls} />
          </Field>
        )}
        <Field label="File (jpg/png/pdf, ≤5MB)">
          <input
            name="file"
            type="file"
            required
            accept=".jpg,.jpeg,.png,.pdf"
            className={inputCls}
          />
        </Field>
        <div className="flex items-end gap-2">
          <Btn tone="primary" type="submit">
            Send
          </Btn>
          {msg && <span className="text-xs text-zinc-500">{msg}</span>}
        </div>
      </form>
    </Card>
  );
}

export function DriverDocuments({
  driverId,
  initial,
}: {
  driverId: string;
  initial: DriverDocument[];
}) {
  const verified = initial.filter((d) => d.status === "verified").length;
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="My documents"
        badge={
          <Badge tone={verified === DOC_TYPES.length ? "ok" : "warn"}>
            {verified}/{DOC_TYPES.length} verified
          </Badge>
        }
      />
      <UploadCard driverId={driverId} onDone={() => window.location.reload()} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {DOC_TYPES.map((t) => (
          <TypeCard key={t} type={t} docs={initial} />
        ))}
      </div>
    </div>
  );
}
