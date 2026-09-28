import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isStaff, type Role } from "@/lib/access";
import { listAllTrips } from "@/lib/trips";
import { listDrivers } from "@/lib/drivers";
import { OpsTripsBoard } from "./board";

export default async function TripsPage() {
  const session = await auth();
  const roles = (session?.user as { roles?: Role[] } | undefined)?.roles ?? [];
  if (!roles.some((r) => isStaff(r))) redirect("/no-access");
  const [trips, drivers] = await Promise.all([listAllTrips(), listDrivers()]);
  return <OpsTripsBoard initial={trips} drivers={drivers} />;
}
