import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isStaff, type Role } from "@/lib/access";
import { listDrivers } from "@/lib/drivers";
import { OpsDriverTable } from "./table";

export default async function DriversPage() {
  const session = await auth();
  const roles = (session?.user as { roles?: Role[] } | undefined)?.roles ?? [];
  if (!roles.some((r) => isStaff(r))) redirect("/no-access");
  const drivers = await listDrivers();
  return <OpsDriverTable initial={drivers} />;
}
