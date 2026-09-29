"use client";

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
      <button
        className="mt-6 rounded-lg bg-brand-700 px-4 py-2 text-sm text-white"
        onClick={() => reset()}
      >
        Try again
      </button>
    </main>
  );
}
