import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isStaff, type Role } from "@/lib/access";
import { getDriverByUser } from "@/lib/drivers";
import { listDriverDocuments } from "@/lib/driverDocs";
import { DriverDocuments } from "./docs";

export default async function DriverDocumentsPage() {
  const session = await auth();
  const u = session?.user as { id?: string; roles?: Role[] } | undefined;
  const roles = u?.roles ?? [];
  if (roles.some((r) => isStaff(r))) redirect("/drivers");
  if (!roles.includes("driver")) redirect("/no-access");
  const profile = u?.id ? await getDriverByUser(u.id) : null;
  if (!profile) redirect("/no-access");
  const docs = await listDriverDocuments(profile.id);
  return <DriverDocuments driverId={profile.id} initial={docs} />;
}
