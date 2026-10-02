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
      if (!res.ok)
        throw new Error(friendlyError(body.message ?? "request failed"));
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
        throw new Error(friendlyError(body.message ?? "invalid code"));
      }
      // Clear the prefetch cache so post-login navigation fetches fresh.
      router.refresh();
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "verify failed");
    } finally {
      setBusy(false);
    }
  }

  function friendlyError(raw: string): string {
    if (/account not found/i.test(raw)) {
      return "No account for this number. Agency logins are created by your administrator — ask them to add you first.";
    }
    if (/failed to fetch|network|connection/i.test(raw)) {
      return "Could not reach the server. Check your connection and try again.";
    }
    return raw;
  }

  return (
    <div className="mt-8">
      {!challengeId ? (
        <>
          <p className="text-sm font-semibold">Step 1 of 2 — your number</p>
          <p className="mt-1 text-sm text-slate-600">
            Use the mobile number your agency registered for you.
          </p>
          <div className="mt-3 grid gap-2">
            <Label htmlFor="agency-phone">Phone number</Label>
            <Input
              id="agency-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0917100003"
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
          <p className="mt-3 text-xs text-slate-500">
            We text you a 6-digit code. It stops working after 5 minutes.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold">Step 2 of 2 — enter the code</p>
          <p className="mt-1 text-sm text-slate-600">
            Sent to {phone}. Wrong number?{" "}
            <button
              className="font-medium text-brand-700 underline"
              onClick={() => {
                setChallengeId(null);
                setCode("");
                setError(null);
              }}
            >
              Start over
            </button>
          </p>
          <div className="mt-3 grid gap-2">
            <Label htmlFor="agency-code">One-time code</Label>
            <Input
              id="agency-code"
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
