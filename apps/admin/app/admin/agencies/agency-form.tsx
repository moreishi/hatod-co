"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Label } from "@/components/ui/label.js";

export function AgencyForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [cityCode, setCityCode] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/agencies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, cityCode, contactPhone }),
      });
      const body = (await res.json()) as { slug?: string; message?: string };
      if (!res.ok) {
        setError(body.message ?? "create failed");
        return;
      }
      setResult(`Agency created — slug: ${body.slug}`);
      setName("");
      setCityCode("");
      setContactPhone("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const ready =
    name.trim() !== "" && cityCode.trim() !== "" && contactPhone.trim() !== "";

  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-2">
          <Label htmlFor="agency-name">Name</Label>
          <Input
            id="agency-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="South Wheels"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="agency-city">City code</Label>
          <Input
            id="agency-city"
            value={cityCode}
            onChange={(e) => setCityCode(e.target.value)}
            placeholder="072217000"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="agency-phone">Contact phone</Label>
          <Input
            id="agency-phone"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="09170000000"
          />
        </div>
        <Button onClick={create} disabled={!ready || busy}>
          {busy ? "Creating…" : "Create agency"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Slug derives from the name. The agency opens ACTIVE with a zero wallet;
        add owners and vehicles from the agency portal afterwards.
      </p>
      {result && (
        <p className="mt-2 font-mono text-xs text-emerald-700">{result}</p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
