"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Label } from "@/components/ui/label.js";

export function LoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function request() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/session/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const body = (await res.json()) as {
        challengeId?: string;
        devCode?: string;
        message?: string;
      };
      if (!res.ok) throw new Error(body.message ?? "request failed");
      setChallengeId(body.challengeId ?? null);
      setDevCode(body.devCode ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "request failed");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/session/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ challengeId, code }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { message?: string };
        throw new Error(body.message ?? "invalid code");
      }
      // Clear the prefetch cache: pre-login prefetches of gated pages replay
      // their 307s otherwise and the push silently goes nowhere.
      router.refresh();
      router.push("/me");
    } catch (e) {
      setError(e instanceof Error ? e.message : "verify failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8">
      {!challengeId ? (
        <>
          <div className="grid gap-2">
            <Label htmlFor="admin-phone">Phone number</Label>
            <Input
              id="admin-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0917100000"
              inputMode="tel"
            />
          </div>
          <Button
            className="mt-4 w-full"
            onClick={request}
            disabled={busy || !phone}
          >
            Send code
          </Button>
        </>
      ) : (
        <>
          <div className="grid gap-2">
            <Label htmlFor="admin-code">One-time code</Label>
            <Input
              id="admin-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              inputMode="numeric"
            />
          </div>
          {devCode && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              LocalStage code: <strong>{devCode}</strong>
            </p>
          )}
          <Button
            className="mt-4 w-full"
            onClick={verify}
            disabled={busy || code.length !== 6}
          >
            Verify
          </Button>
        </>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
