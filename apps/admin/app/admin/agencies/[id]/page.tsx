import Link from "next/link";
import { apiAsUser, type AgencyDto } from "@/lib/api.js";
import { humanStatus } from "@/lib/status.js";
import { Badge } from "@/components/ui/badge.js";
import { Card } from "@/components/ui/card.js";
import { AdminNav } from "../../admin-nav.js";
import { FleetPanel } from "./fleet-panel.js";

interface AgencyDriver {
  id: string;
  status: string;
  user: { displayName: string; phone: string };
  assignments: { vehicle: { plateNo: string; type: string } }[];
}

interface AgencyRide {
  id: string;
  status: string;
  pickupLabel: string;
  dropoffLabel: string;
  fareCentavos: number;
  driver: { user: { displayName: string } } | null;
}

interface AgencyVehicle {
  id: string;
  plateNo: string;
  type: string;
  assignments: { driver: { user: { displayName: string } } }[];
}

export default async function AdminAgencyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [agencies, drivers, vehicles, rides] = await Promise.all([
    apiAsUser<AgencyDto[]>("/api/agencies/mine"),
    apiAsUser<AgencyDriver[]>(`/api/agencies/${id}/drivers`),
    apiAsUser<AgencyVehicle[]>(`/api/agencies/${id}/vehicles`),
    apiAsUser<AgencyRide[]>(`/api/agencies/${id}/rides`),
  ]);
  const agency = agencies.find((a) => a.id === id);
  if (!agency) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-16">
        <p>Agency not found.</p>
      </main>
    );
  }
  const activeRides = rides.filter((r) =>
    [
      "REQUESTED",
      "NO_DRIVERS",
      "ASSIGNED",
      "DRIVER_EN_ROUTE",
      "DRIVER_ARRIVED",
      "IN_PROGRESS",
    ].includes(r.status),
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <AdminNav />
      <Link
        href="/admin/agencies"
        className="mt-4 inline-block text-sm font-medium text-brand-700"
      >
        ← Agencies
      </Link>
      <h1 className="mt-2 text-3xl font-bold">{agency.name}</h1>
      <p className="mt-1 font-mono text-xs text-slate-500">
        {agency.slug} · {agency.contactPhone} · {agency.cityCode}
      </p>
      <div className="mt-2">
        <Badge
          className={
            agency.status === "ACTIVE"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-600"
          }
        >
          <span title={agency.status}>
            {agency.status === "ACTIVE" ? "Active" : agency.status}
          </span>
        </Badge>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="font-mono text-xs text-slate-500">DRIVERS</p>
          <p className="mt-1 text-xl font-bold">{drivers.length}</p>
        </Card>
        <Card className="p-4">
          <p className="font-mono text-xs text-slate-500">VEHICLES</p>
          <p className="mt-1 text-xl font-bold">{vehicles.length}</p>
        </Card>
        <Card className="p-4">
          <p className="font-mono text-xs text-slate-500">LIVE RIDES</p>
          <p className="mt-1 text-xl font-bold">{activeRides.length}</p>
        </Card>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Drivers</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Everyone driving for this agency. Approvals happen on the driver board
          in the agency portal.
        </p>
        <Card className="mt-3 overflow-hidden p-0">
          <ul className="divide-y">
            {drivers.map((driver) => (
              <li
                key={driver.id}
                className="flex flex-wrap items-center justify-between gap-3 px-6 py-3"
              >
                <div>
                  <p className="font-medium">{driver.user.displayName}</p>
                  <p className="font-mono text-xs text-slate-500">
                    {driver.user.phone} ·{" "}
                    {driver.assignments[0]
                      ? `${driver.assignments[0].vehicle.plateNo} · ${driver.assignments[0].vehicle.type}`
                      : "no vehicle assigned"}
                  </p>
                </div>
                <Badge variant="secondary" title={driver.status}>
                  {humanStatus(driver.status)}
                </Badge>
              </li>
            ))}
            {drivers.length === 0 && (
              <li className="px-6 py-4 text-sm text-slate-500">
                No drivers yet.
              </li>
            )}
          </ul>
        </Card>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Fleet</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Register vehicles, then assign each one to an active driver. Drivers
          without a vehicle get no offers.
        </p>
        <div className="mt-3">
          <FleetPanel agencyId={id} vehicles={vehicles} drivers={drivers} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Recent rides</h2>
        <Card className="mt-3 overflow-hidden p-0">
          <ul className="divide-y">
            {rides.slice(0, 10).map((ride) => (
              <li
                key={ride.id}
                className="flex flex-wrap items-center justify-between gap-3 px-6 py-3"
              >
                <div>
                  <p className="font-medium">
                    {ride.pickupLabel} → {ride.dropoffLabel}
                  </p>
                  <p className="font-mono text-xs text-slate-500">
                    {ride.driver?.user.displayName ?? "unassigned"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm">
                    ₱{(ride.fareCentavos / 100).toFixed(2)}
                  </span>
                  <Badge variant="secondary" title={ride.status}>
                    {humanStatus(ride.status)}
                  </Badge>
                </div>
              </li>
            ))}
            {rides.length === 0 && (
              <li className="px-6 py-4 text-sm text-slate-500">
                No rides yet.
              </li>
            )}
          </ul>
        </Card>
      </section>
    </main>
  );
}
