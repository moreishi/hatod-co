import Link from "next/link";
import { agencyDrivers, agencyRides } from "@/lib/api.js";
import { DispatchBoard } from "./dispatch-board.js";

const BOARD_STATUSES = [
  "REQUESTED",
  "ASSIGNED",
  "DRIVER_EN_ROUTE",
  "DRIVER_ARRIVED",
  "IN_PROGRESS",
];

export default async function DispatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [rides, drivers] = await Promise.all([
    agencyRides(id, BOARD_STATUSES),
    agencyDrivers(id),
  ]);
  const dispatchable = drivers.filter(
    (d) => d.status === "ACTIVE" && d.assignments.length > 0,
  );
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <Link
        href={`/agencies/${id}`}
        className="text-sm font-medium text-brand-700"
      >
        ← Driver board
      </Link>
      <h1 className="mt-2 text-3xl font-bold">Dispatch</h1>
      <p className="mt-1 font-mono text-xs text-slate-500">{id}</p>
      <DispatchBoard rides={rides} drivers={dispatchable} />
    </main>
  );
}
