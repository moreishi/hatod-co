import Link from "next/link";
import { agencyDocuments, agencyDrivers } from "@/lib/api.js";
import type { DocumentDto } from "@/lib/api.js";
import { humanStatus } from "@/lib/status.js";
import { Badge } from "@/components/ui/badge.js";
import { Card } from "@/components/ui/card.js";
import { DriverReviewActions } from "../../driver-review-actions.js";
import { ReviewQueue } from "../../documents/review-queue.js";

export default async function AgencyDriverDetailPage({
  params,
}: {
  params: Promise<{ id: string; driverId: string }>;
}) {
  const { id, driverId } = await params;
  const [drivers, allDocs] = await Promise.all([
    agencyDrivers(id),
    agencyDocuments(id),
  ]);
  const driver = drivers.find((d) => d.id === driverId);
  if (!driver) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-16">
        <p>Driver not found in this agency.</p>
      </main>
    );
  }
  const docs: DocumentDto[] = allDocs.filter((d) => d.driverId === driverId);
  const verified = docs.filter((d) => d.status === "VERIFIED").length;

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <Link
        href={`/agencies/${id}`}
        className="text-sm font-medium text-brand-700"
      >
        ← Driver board
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">{driver.user.displayName}</h1>
        <Badge variant="secondary" title={driver.status}>
          {humanStatus(driver.status)}
        </Badge>
      </div>
      <p className="mt-1 font-mono text-xs text-slate-500">
        {driver.user.phone} ·{" "}
        {driver.assignments[0]
          ? `${driver.assignments[0].vehicle.plateNo} · ${driver.assignments[0].vehicle.type}`
          : "no vehicle assigned"}
      </p>
      <p className="mt-1 text-sm text-slate-600">
        {docs.length === 0
          ? "No documents submitted yet."
          : `${verified} of ${docs.length} documents verified.`}
      </p>
      <div className="mt-4">
        <DriverReviewActions driverId={driver.id} status={driver.status} />
      </div>

      <h2 className="mt-10 text-lg font-semibold">Documents</h2>
      <ReviewQueue docs={docs} />
    </main>
  );
}
