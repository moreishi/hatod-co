import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isStaff, type Role } from "@/lib/access";
import { listFleetPendingDocs } from "@/lib/driverDocs";
import { summarizePending } from "@/lib/documents";
import { Badge, Card, PageHeader } from "../../ui";

export default async function FleetDocumentsPage() {
  const session = await auth();
  const u = session?.user as { id?: string; roles?: Role[] } | undefined;
  const roles = u?.roles ?? [];
  if (roles.some((r) => isStaff(r))) redirect("/fleet");
  if (!roles.includes("agency")) redirect("/no-access");
  const pending = await listFleetPendingDocs(u?.id ?? "");
  const rows = summarizePending(
    pending.map((d) => ({ driverId: d.driverId, driverName: d.driverName, status: d.status })),
  );
  const total = pending.length;
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Documents inbox"
        badge={<Badge tone={total > 0 ? "warn" : "ok"}>{total} pending</Badge>}
      />
      <Card flush>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2">Driver</th>
                <th className="px-4 py-2">Awaiting review</th>
                <th className="px-4 py-2">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-sm text-zinc-500">
                    Inbox zero — nothing awaiting review.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.driverId} className="hover:bg-zinc-50/60">
                  <td className="px-4 py-2 font-medium">{r.driverName}</td>
                  <td className="px-4 py-2">
                    <Badge tone="warn">{r.count}</Badge>
                  </td>
                  <td className="px-4 py-2">
                    <a href={`/fleet/drivers/${r.driverId}`} className="underline">
                      Review
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
