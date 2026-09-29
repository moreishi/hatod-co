import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hailing Admin",
  description: "Platform administration for the Cebu pilot.",
};

const NAV = [
  { href: "/me", label: "Session" },
  { href: "/admin/rides", label: "Rides" },
  { href: "/admin/finance", label: "Finance" },
  { href: "/admin/users", label: "Admins" },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-3">
            <span className="font-bold text-brand-900">Hailing Admin</span>
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-slate-600 hover:text-brand-700"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
