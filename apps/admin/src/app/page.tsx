import { docsExpiringSoon } from "@/lib/seed";
import { listDrivers } from "@/lib/drivers";
import { listAllTrips } from "@/lib/trips";
import { listZones } from "@/lib/zones";
import { Badge, Card, PageHeader } from "./ui";

export default async function Dashboard() {
  const [drivers, trips, zones] = await Promise.all([
    listDrivers(),
    listAllTrips(200),
    listZones(),
  ]);
  const online = drivers.filter((d) => d.status === "online").length;
  const pending = drivers.filter((d) => d.status === "pending").length;
  const active = trips.filter(
    (t) => t.status === "SEARCHING" || t.status === "IN_PROGRESS",
  ).length;
  const expiring = drivers.filter(
    (d) => docsExpiringSoon(d.docs.paExpiry) || docsExpiringSoon(d.docs.cpcExpiry),
  );
  const shown = expiring.slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Gensan pilot — today"
        badge={<Badge tone="info">{zones.length} zones live</Badge>}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Online drivers", online],
          ["Pending approval", pending],
          ["Active trips", active],
          ["Pilot zones", zones.length],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {label}
            </p>
            <p className="mt-1 font-sans text-3xl font-bold tabular-nums">{value}</p>
          </Card>
        ))}
      </div>
      <Card>
        <div className="mb-2 flex items-center gap-2">
          <h2 className="font-semibold">Docs expiring within 30 days</h2>
          <Badge tone={expiring.length === 0 ? "ok" : "warn"}>{expiring.length}</Badge>
        </div>
        {expiring.length === 0 ? (
          <p className="text-sm text-zinc-500">None — fleet compliant.</p>
        ) : (
          <ul className="text-sm">
            {shown.map((d) => (
              <li key={d.id} className="border-t border-zinc-100 py-2 first:border-0">
                <span className="font-medium">{d.name}</span> ({d.plateNo}) — PA{" "}
                {d.docs.paExpiry}, CPC {d.docs.cpcExpiry}
              </li>
            ))}
          </ul>
        )}
        {expiring.length > shown.length && (
          <p className="mt-1 text-xs text-zinc-500">
            +{expiring.length - shown.length} more — see Drivers.
          </p>
        )}
      </Card>
    </div>
  );
}
