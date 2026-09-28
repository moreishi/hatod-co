"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Polling refresh for live boards (fleet live, ops trips, offers). */
export function AutoRefresh({ ms = 15000 }: { ms?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), ms);
    return () => clearInterval(t);
  }, [router, ms]);
  return null;
}
