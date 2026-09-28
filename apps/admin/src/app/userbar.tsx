"use client";

import { signOut } from "next-auth/react";

export function SignOutBtn() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="w-full rounded-md px-3 py-2 text-left text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 md:text-center lg:text-left"
    >
      <span className="md:hidden lg:inline">Sign out</span>
      <span className="hidden md:inline lg:hidden" title="Sign out">
        ×
      </span>
    </button>
  );
}
