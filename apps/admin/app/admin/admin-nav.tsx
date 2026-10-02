"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils.js";

const ITEMS = [
  { href: "/admin/users", label: "Administrators" },
  { href: "/admin/agencies", label: "Agencies" },
  { href: "/admin/rides", label: "Rides" },
  { href: "/admin/finance", label: "Finance" },
  { href: "/admin/audit", label: "Audit log" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-2">
      {ITEMS.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              active
                ? "bg-brand-700 text-white"
                : "border bg-white text-slate-600",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
