import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { auth } from "@/auth";
import { SignOutBtn } from "./userbar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hatod Admin — Gensan Ops",
  description: "Fleet, zones, fares and live dispatch for Hatod ride-hailing pilot",
};

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/riders", label: "Riders" },
  { href: "/drivers", label: "Drivers" },
  { href: "/zones", label: "Zones & Fares" },
  { href: "/trips", label: "Trips" },
];

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const loggedIn = !!session?.user;
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-zinc-100 text-zinc-900">
        <div className="flex min-h-screen flex-col lg:flex-row">
          {loggedIn && (
            <>
              {/* Tablet/desktop sidebar: icons + labels from md up, full from lg */}
              <aside className="hidden bg-zinc-950 text-zinc-100 md:block md:w-16 lg:w-56 lg:p-4">
                <div className="mb-6 hidden px-2 lg:block">
                  <p className="text-lg font-bold">Hatod Admin</p>
                  <p className="text-xs text-zinc-400">Gensan pilot ops</p>
                  {session?.user?.email && (
                    <p className="mt-1 truncate text-xs text-zinc-500">
                      {session.user.email}
                    </p>
                  )}
                </div>
                <nav className="flex flex-row gap-1 p-2 md:flex-col lg:p-0">
                  {NAV.map((n) => (
                    <Link
                      key={n.href}
                      href={n.href}
                      title={n.label}
                      className="rounded-md px-3 py-2 text-sm hover:bg-zinc-800 md:text-center lg:text-left"
                    >
                      <span className="md:hidden lg:inline">{n.label}</span>
                      <span className="hidden md:inline lg:hidden">
                        {n.label.slice(0, 1)}
                      </span>
                    </Link>
                  ))}
                  <SignOutBtn />
                </nav>
              </aside>
              {/* Mobile top bar: below md */}
              <header className="bg-zinc-950 text-zinc-100 md:hidden">
                <p className="px-4 pt-3 text-base font-bold">Hatod Admin</p>
                <nav className="flex gap-1 overflow-x-auto p-2">
                  {NAV.map((n) => (
                    <Link
                      key={n.href}
                      href={n.href}
                      className="whitespace-nowrap rounded-md px-3 py-2 text-sm hover:bg-zinc-800"
                    >
                      {n.label}
                    </Link>
                  ))}
                  <Link
                    href="/api/auth/signout"
                    className="whitespace-nowrap rounded-md px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
                  >
                    Sign out
                  </Link>
                </nav>
              </header>
            </>
          )}
          <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
