"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
      router.refresh();
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "verify failed");
    } finally {
      setBusy(false);
    }
  }

  const input =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none";
  const btn =
    "mt-4 w-full rounded-lg bg-brand-700 px-4 py-2 font-medium text-white disabled:opacity-50";

  return (
    <div className="mt-8">
      {!challengeId ? (
        <>
          <label className="text-sm font-medium">
            Phone number
            <input
              className={input}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0917100031"
              inputMode="tel"
            />
          </label>
          <button className={btn} onClick={request} disabled={busy || !phone}>
            Send code
          </button>
        </>
      ) : (
        <>
          <label className="text-sm font-medium">
            One-time code
            <input
              className={input}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              inputMode="numeric"
            />
          </label>
          {devCode && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              LocalStage code: <strong>{devCode}</strong>
            </p>
          )}
          <button
            className={btn}
            onClick={verify}
            disabled={busy || code.length !== 6}
          >
            Verify
          </button>
        </>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
