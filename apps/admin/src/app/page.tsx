import { drivers, trips, zones, docsExpiringSoon } from "@/lib/seed";

export default function Dashboard() {
  const online = drivers.filter((d) => d.status === "online").length;
  const pending = drivers.filter((d) => d.status === "pending").length;
  const active = trips.filter((t) => t.status === "SEARCHING" || t.status === "IN_PROGRESS").length;
  const expiring = drivers.filter(
    (d) => docsExpiringSoon(d.docs.paExpiry) || docsExpiringSoon(d.docs.cpcExpiry),
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Gensan pilot — today</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Online drivers", online],
          ["Pending approval", pending],
          ["Active trips", active],
          ["Pilot zones", zones.length],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs text-zinc-500">{label}</p>
            <p className="text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold">Docs expiring within 30 days</h2>
        {expiring.length === 0 ? (
          <p className="text-sm text-zinc-500">None — fleet compliant.</p>
        ) : (
          <ul className="text-sm">
            {expiring.map((d) => (
              <li key={d.id} className="border-t py-2 first:border-0">
                {d.name} ({d.plateNo}) — PA {d.docs.paExpiry}, CPC {d.docs.cpcExpiry}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
