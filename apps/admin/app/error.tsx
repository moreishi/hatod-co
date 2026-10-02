"use client";

import { Button } from "@/components/ui/button.js";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 font-mono text-xs text-slate-500">{error.message}</p>
      <div className="mt-6 flex justify-center">
        <Button onClick={() => reset()}>Try again</Button>
      </div>
    </main>
  );
}
