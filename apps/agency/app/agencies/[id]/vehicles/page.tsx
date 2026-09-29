import Link from "next/link";
import { agencyDrivers, agencyVehicles } from "@/lib/api.js";
import { FleetManager } from "./fleet-manager.js";

export default async function VehiclesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [vehicles, drivers] = await Promise.all([
    agencyVehicles(id),
    agencyDrivers(id),
  ]);
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <Link
        href={`/agencies/${id}`}
        className="text-sm font-medium text-brand-700"
      >
        ← Driver board
      </Link>
      <h1 className="mt-2 text-3xl font-bold">Fleet</h1>
      <p className="mt-1 font-mono text-xs text-slate-500">{id}</p>
      <FleetManager agencyId={id} vehicles={vehicles} drivers={drivers} />
    </main>
  );
}
