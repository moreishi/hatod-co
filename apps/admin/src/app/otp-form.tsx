"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Btn, Card, Field, inputCls } from "./ui";
import { requestOtpAction } from "./otp-actions";

function OtpFormInner({
  title,
  subtitle,
  fallbackNext,
  footer,
}: {
  title: string;
  subtitle: string;
  fallbackNext: string;
  footer?: React.ReactNode;
}) {
  const router = useRouter();
  const next = useSearchParams().get("next") || fallbackNext;
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendCode(form: FormData) {
    setBusy(true);
    setMsg("");
    const p = String(form.get("phone") ?? "");
    const r = await requestOtpAction(p);
    setBusy(false);
    if (!r.ok) {
      setMsg(
        r.retryAfterS
          ? `Code already sent — wait ${r.retryAfterS}s before resending.`
          : (r.error ?? "Could not send code."),
      );
      return;
    }
    setPhone(p);
    setStep("code");
    setMsg("Code sent — check your SMS.");
  }

  async function verify(form: FormData) {
    setBusy(true);
    setMsg("");
    const res = await signIn("credentials", {
      phone,
      code: String(form.get("code") ?? ""),
      redirect: false,
    });
    setBusy(false);
    if (res?.error) setMsg("Wrong or expired code — try again or resend.");
    else {
      router.push(next);
      router.refresh();
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4 pt-16">
      <div className="text-center">
        <p className="font-sans text-xl font-bold">{title}</p>
        <p className="text-sm text-zinc-500">{subtitle}</p>
      </div>
      <Card>
        {step === "phone" ? (
          <form action={sendCode} className="flex flex-col gap-3">
            <Field label="Mobile number">
              <input
                name="phone"
                required
                inputMode="tel"
                autoComplete="tel"
                placeholder="09171110011"
                className={inputCls}
              />
            </Field>
            {msg && <p className="text-sm text-red-600">{msg}</p>}
            <Btn tone="primary" type="submit" disabled={busy} className="py-2 text-sm">
              {busy ? "Sending…" : "Send code"}
            </Btn>
          </form>
        ) : (
          <form action={verify} className="flex flex-col gap-3">
            <p className="text-sm text-zinc-600">
              Code sent to <span className="font-medium tabular-nums">{phone}</span>{" "}
              <button type="button" className="underline" onClick={() => setStep("phone")}>
                change
              </button>
            </p>
            <Field label="6-digit code">
              <input
                name="code"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="••••••"
                className={inputCls}
              />
            </Field>
            {msg && <p className="text-sm text-red-600">{msg}</p>}
            <Btn tone="primary" type="submit" disabled={busy} className="py-2 text-sm">
              {busy ? "Verifying…" : "Sign in"}
            </Btn>
          </form>
        )}
      </Card>
      {footer}
    </div>
  );
}

export function OtpLoginForm(props: {
  title: string;
  subtitle: string;
  fallbackNext: string;
  footer?: React.ReactNode;
}) {
  return (
    <Suspense>
      <OtpFormInner {...props} />
    </Suspense>
  );
}
