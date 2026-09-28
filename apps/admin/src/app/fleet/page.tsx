import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isStaff, type Role } from "@/lib/access";
import { listDrivers } from "@/lib/drivers";
import { listFleetDocs } from "@/lib/driverDocs";
import { fleetAlerts } from "@/lib/alerts";
import { getOnboarding, listApplications } from "@/lib/agency";
import { Badge, Card, PageHeader } from "../ui";
import Link from "next/link";
import { Btn } from "../ui";

export default async function FleetDashboard() {
  const session = await auth();
  const u = session?.user as { id?: string; roles?: Role[] } | undefined;
  const roles = u?.roles ?? [];
  if (roles.some((r) => isStaff(r))) redirect("/");
  if (!roles.includes("agency")) redirect("/no-access");
  const drivers = await listDrivers({ agencyUserId: u?.id ?? "" });
  const online = drivers.filter((d) => d.status === "online").length;
  const pending = drivers.filter((d) => d.status === "pending").length;
  const apps = await listApplications().catch(() => []);
  const mine = apps.find((a) => a.userId === u?.id && a.status === "approved");
  const onboarding = mine ? await getOnboarding(mine.id).catch(() => null) : null;
  const fleetDocs = await listFleetDocs(u?.id ?? "").catch(() => []);
  const byDriver = new Map<
    string,
    { driverName: string; docs: { type: string; status: string; expiryDate: string | null }[] }
  >();
  for (const doc of fleetDocs) {
    const row = byDriver.get(doc.driverId) ?? { driverName: doc.driverName, docs: [] };
    row.docs.push(doc);
    byDriver.set(doc.driverId, row);
  }
  const alerts = fleetAlerts({
    drivers: drivers.map((d) => ({ id: d.id, name: d.name, status: d.status })),
    docs: [...byDriver.entries()].map(([driverId, v]) => ({
      driverId,
      driverName: v.driverName,
      docs: v.docs.map((x) => ({ type: x.type, status: x.status, expiryDate: x.expiryDate })),
    })),
    pendingDocs: fleetDocs.filter((d) => d.status === "pending").length,
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="My fleet" badge={<Badge tone="info">agency</Badge>} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          ["Drivers", drivers.length],
          ["Online now", online],
          ["Pending approval", pending],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
            <p className="mt-1 font-sans text-3xl font-bold tabular-nums">{value}</p>
          </Card>
        ))}
      </div>
      {alerts.length > 0 && (
        <Card>
          <h2 className="mb-2 font-semibold">Needs attention</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {alerts.map((a, i) => (
              <li key={i} className="flex items-center gap-2">
                <Badge tone={a.severity === "bad" ? "bad" : "warn"}>
                  {a.kind === "pending-docs" ? "inbox" : a.kind}
                </Badge>
                <span>{a.text}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {mine && onboarding && (
        <Card>
          <h2 className="mb-1 font-semibold">Onboarding progress</h2>
          <p className="text-sm text-zinc-600">
            {onboarding.done.length} of 5 steps complete
            {onboarding.done.length === 5 ? " — ready for go-live." : "."}
          </p>
        </Card>
      )}
      <div>
        <Link href="/fleet/drivers">
          <Btn tone="primary">Manage drivers</Btn>
        </Link>
      </div>
    </div>
  );
}
