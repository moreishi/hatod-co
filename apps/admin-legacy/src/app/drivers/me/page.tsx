import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isStaff, type Role } from "@/lib/access";
import { getDriverByUser } from "@/lib/drivers";
import { getDriverAgency } from "@/lib/drivers";
import { listDriverTrips } from "@/lib/ledger";
import { getActiveTrip, listOpenOffers } from "@/lib/trips";
import { DriverHome } from "./home";
import { TripWork } from "./work";
import { EarningsSection } from "./earnings-section";

export default async function DriverMePage() {
  const session = await auth();
  const u = session?.user as { id?: string; roles?: Role[] } | undefined;
  const roles = u?.roles ?? [];
  if (roles.some((r) => isStaff(r))) redirect("/drivers");
  if (!roles.includes("driver")) redirect("/no-access");
  const profile = u?.id ? await getDriverByUser(u.id) : null;
  if (!profile) redirect("/no-access");
  const trips = await listDriverTrips(profile.id);
  const agency = await getDriverAgency(profile.id);
  const active = await getActiveTrip(profile.id);
  const offers = active ? [] : await listOpenOffers();
  return (
    <div className="flex flex-col gap-4">
      <DriverHome profile={profile} agencyName={agency?.displayName ?? null} />
      <TripWork active={active} offers={offers} />
      <EarningsSection trips={trips} />
    </div>
  );
}
