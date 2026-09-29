import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isStaff, type Role } from "@/lib/access";
import { getDriverByUser } from "@/lib/drivers";
import { queryDb } from "@/lib/db";
import { Card, PageHeader } from "../../../ui";

export default async function DriverSettingsPage() {
  const session = await auth();
  const u = session?.user as { id?: string; roles?: Role[] } | undefined;
  const roles = u?.roles ?? [];
  if (roles.some((r) => isStaff(r))) redirect("/drivers");
  if (!roles.includes("driver")) redirect("/no-access");
  const profile = u?.id ? await getDriverByUser(u.id) : null;
  if (!profile) redirect("/no-access");
  const rows = u?.id
    ? await queryDb<{ phone: string | null }>("SELECT phone FROM users WHERE id = $1", [u.id])
    : [];
  const phone = rows[0]?.phone ?? profile.phone;
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Settings" />
      <Card>
        <h2 className="mb-2 font-semibold">Sign-in</h2>
        <p className="text-sm">
          Codes go to <span className="font-medium tabular-nums">{phone}</span>. No passwords —
          ask your agency to update the number if it changes.
        </p>
      </Card>
    </div>
  );
}
