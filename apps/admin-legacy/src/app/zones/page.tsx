import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isStaff, type Role } from "@/lib/access";
import { listZones } from "@/lib/zones";
import { ZonesEditor } from "./editor";

export default async function ZonesPage() {
  const session = await auth();
  const roles = (session?.user as { roles?: Role[] } | undefined)?.roles ?? [];
  if (!roles.some((r) => isStaff(r))) redirect("/no-access");
  const zones = await listZones();
  return <ZonesEditor initial={zones} />;
}
