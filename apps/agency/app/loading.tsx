export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-24">
      <div className="animate-pulse space-y-3">
        <div className="h-8 w-48 rounded-lg bg-slate-200" />
        <div className="h-4 w-full rounded-lg bg-slate-100" />
        <div className="h-4 w-full rounded-lg bg-slate-100" />
        <div className="h-4 w-2/3 rounded-lg bg-slate-100" />
      </div>
    </main>
  );
}
