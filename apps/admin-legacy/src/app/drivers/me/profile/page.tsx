import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isStaff, type Role } from "@/lib/access";
import { getDriverByUser } from "@/lib/drivers";
import { ProfileForm } from "./form";

export default async function DriverProfilePage() {
  const session = await auth();
  const u = session?.user as { id?: string; roles?: Role[] } | undefined;
  const roles = u?.roles ?? [];
  if (roles.some((r) => isStaff(r))) redirect("/drivers");
  if (!roles.includes("driver")) redirect("/no-access");
  const profile = u?.id ? await getDriverByUser(u.id) : null;
  if (!profile) redirect("/no-access");
  return <ProfileForm profile={profile} />;
}
