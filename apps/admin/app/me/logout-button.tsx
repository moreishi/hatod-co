"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium"
      onClick={async () => {
        await fetch("/api/session", { method: "DELETE" });
        router.push("/login");
      }}
    >
      Sign out
    </button>
  );
}
