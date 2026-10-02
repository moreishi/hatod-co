"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Label } from "@/components/ui/label.js";

export function AcceptForm({ token }: { token: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setError(null);
    const res = await fetch(`/api/admin/invitations/${token}/accept`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });
    const body = (await res.json()) as { message?: string };
    if (!res.ok) {
      setError(body.message ?? "accept failed");
      return;
    }
    router.push("/login");
  }

  return (
    <div className="mt-8 grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="accept-phone">Phone number</Label>
        <Input
          id="accept-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="accept-password">Password (min 8 characters)</Label>
        <Input
          id="accept-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button
        className="w-full"
        onClick={accept}
        disabled={!phone || password.length < 8}
      >
        Activate account
      </Button>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
