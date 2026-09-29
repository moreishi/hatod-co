import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isStaff, type Role } from "@/lib/access";
import { listDrivers } from "@/lib/drivers";
import { FleetDrivers } from "./table";

export default async function FleetDriversPage() {
  const session = await auth();
  const u = session?.user as { id?: string; roles?: Role[] } | undefined;
  const roles = u?.roles ?? [];
  if (roles.some((r) => isStaff(r))) redirect("/");
  if (!roles.includes("agency")) redirect("/no-access");
  const drivers = await listDrivers({ agencyUserId: u?.id ?? "" });
  return <FleetDrivers initial={drivers} />;
}
