"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button.js";

export function LogoutButton() {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      onClick={async () => {
        await fetch("/api/session", { method: "DELETE" });
        router.push("/login");
      }}
    >
      Sign out
    </Button>
  );
}
