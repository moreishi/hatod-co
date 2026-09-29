import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isStaff, type Role } from "@/lib/access";
import { getRiderByUser } from "@/lib/riders";
import { getBalance } from "@/lib/wallet";
import { listZones } from "@/lib/zones";
import { listRiderTrips } from "@/lib/trips";
import { Badge, Card } from "../../ui";
import { RiderHome } from "./home";

export default async function RiderMePage() {
  const session = await auth();
  const u = session?.user as { id?: string; roles?: Role[] } | undefined;
  const roles = u?.roles ?? [];
  if (roles.some((r) => isStaff(r))) redirect("/admin/me");
  if (!roles.includes("rider")) redirect("/no-access");
  const profile = u?.id ? await getRiderByUser(u.id) : null;
  if (!profile || !u?.id) redirect("/no-access");
  const [balanceCents, trips, zones] = await Promise.all([
    getBalance(u.id),
    listRiderTrips(profile.id),
    listZones(),
  ]);
  return (
    <div className="flex flex-col gap-4">
      <RiderHome profile={profile} balanceCents={balanceCents} zones={zones} />
      <Card>
        <div className="mb-2 flex items-center gap-2">
          <h2 className="font-semibold">My trips</h2>
          <Badge tone="info">{trips.length}</Badge>
        </div>
        {trips.length === 0 ? (
          <p className="text-sm text-zinc-500">No trips yet — request your first ride above.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {trips.slice(0, 10).map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between border-t border-zinc-100 pt-2 first:border-0 first:pt-0"
              >
                <span>
                  {t.pickup} → {t.dropoff}
                  <span className="block text-xs text-zinc-500">
                    {t.status} · {t.payment}
                    {t.paid ? " · paid" : ""}
                  </span>
                </span>
                <span className="font-semibold tabular-nums">₱{t.fareQuote}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
