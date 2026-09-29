import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isStaff, type Role } from "@/lib/access";
import { listTripsPaged } from "@/lib/trips";
import { listDrivers } from "@/lib/drivers";
import { listZones } from "@/lib/zones";
import { OpsTripsBoard } from "./board";

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const session = await auth();
  const roles = (session?.user as { roles?: Role[] } | undefined)?.roles ?? [];
  if (!roles.some((r) => isStaff(r))) redirect("/no-access");
  const { q = "", status = "", page = "1" } = await searchParams;
  const [{ rows, total, page: safe, pages }, drivers, zones] = await Promise.all([
    listTripsPaged(q, status, Number(page) || 1),
    listDrivers(),
    listZones(),
  ]);
  const qs = (p: number) =>
    new URLSearchParams({ q, status, page: String(p) }).toString();
  return (
    <OpsTripsBoard
      initial={rows}
      drivers={drivers}
      zones={zones}
      q={q}
      status={status}
      prev={qs(Math.max(1, safe - 1))}
      next={qs(Math.min(pages, safe + 1))}
      safe={safe}
      pages={pages}
      total={total}
    />
  );
}
