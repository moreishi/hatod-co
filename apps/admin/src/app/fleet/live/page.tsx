import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isStaff, type Role } from "@/lib/access";
import { listDrivers } from "@/lib/drivers";
import { splitFleet } from "@/lib/earnings";
import { listAgencyTrips } from "@/lib/ledger";
import { Badge, Card, PageHeader } from "../../ui";
import { AutoRefresh } from "../../auto-refresh";

export default async function FleetLivePage() {
  const session = await auth();
  const u = session?.user as { id?: string; roles?: Role[] } | undefined;
  const roles = u?.roles ?? [];
  if (roles.some((r) => isStaff(r))) redirect("/");
  if (!roles.includes("agency")) redirect("/no-access");
  const drivers = await listDrivers({ agencyUserId: u?.id ?? "" });
  const trips = await listAgencyTrips(u?.id ?? "");
  const live = splitFleet(
    drivers.map((d) => ({ id: d.id, name: d.name, status: d.status })),
    trips.map((t) => ({
      id: t.id,
      driverId: t.driverId,
      status: t.status,
      pickup: t.pickup,
      dropoff: t.dropoff,
    })),
  );
  return (
    <div className="flex flex-col gap-4">
      <AutoRefresh />
      <PageHeader
        title="Live fleet"
        badge={
          <Badge tone={live.onTrip.length > 0 ? "info" : "neutral"}>
            {live.onTrip.length} on trip · {live.idle.length} idle
          </Badge>
        }
      />
      <Card>
        <h2 className="mb-2 font-semibold">On trip</h2>
        {live.onTrip.length === 0 ? (
          <p className="text-sm text-zinc-500">Nobody on trip right now.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {live.onTrip.map((x) => (
              <li key={x.driver.id} className="flex items-center justify-between gap-2 border-t border-zinc-100 pt-2 first:border-0 first:pt-0">
                <span className="font-medium">{x.driver.name}</span>
                <span className="text-zinc-600">
                  {x.trip.pickup} → {x.trip.dropoff}
                </span>
                <Badge tone="info">{x.trip.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <h2 className="mb-2 font-semibold">Idle & online</h2>
        {live.idle.length === 0 ? (
          <p className="text-sm text-zinc-500">No idle drivers online.</p>
        ) : (
          <ul className="flex flex-wrap gap-2 text-sm">
            {live.idle.map((d) => (
              <li key={d.id}>
                <Badge tone="ok">{d.name}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
