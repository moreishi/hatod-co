import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isStaff, type Role } from "@/lib/access";
import { getDriverByUser } from "@/lib/drivers";
import { listDriverTrips } from "@/lib/ledger";
import { TripHistory } from "./history";

export default async function DriverTripsPage() {
  const session = await auth();
  const u = session?.user as { id?: string; roles?: Role[] } | undefined;
  const roles = u?.roles ?? [];
  if (roles.some((r) => isStaff(r))) redirect("/drivers");
  if (!roles.includes("driver")) redirect("/no-access");
  const profile = u?.id ? await getDriverByUser(u.id) : null;
  if (!profile) redirect("/no-access");
  const trips = await listDriverTrips(profile.id);
  return <TripHistory initial={trips} />;
}
