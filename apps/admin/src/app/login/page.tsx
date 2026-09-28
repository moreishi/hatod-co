"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Btn, Card, Field, inputCls } from "../ui";

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/";
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(form: FormData) {
    setBusy(true);
    setError("");
    const res = await signIn("credentials", {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      redirect: false,
    });
    setBusy(false);
    if (res?.error) setError("Invalid email or password.");
    else {
      router.push(next);
      router.refresh();
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4 pt-16">
      <div className="text-center">
        <p className="font-sans text-xl font-bold">Hatod Admin</p>
        <p className="text-sm text-zinc-500">Gensan pilot ops — sign in</p>
      </div>
      <Card>
        <form action={onSubmit} className="flex flex-col gap-3">
          <Field label="Email">
            <input name="email" type="email" required autoComplete="username" className={inputCls} />
          </Field>
          <Field label="Password">
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className={inputCls}
            />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Btn tone="primary" type="submit" disabled={busy} className="py-2 text-sm">
            {busy ? "Signing in…" : "Sign in"}
          </Btn>
        </form>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
