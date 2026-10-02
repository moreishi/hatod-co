import Link from "next/link";
import { agencyDrivers } from "@/lib/api.js";
import { Card } from "@/components/ui/card.js";
import { DriverBoardList } from "./driver-board-list.js";

export default async function DriverBoard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const drivers = await agencyDrivers(id);
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <Link href="/" className="text-sm font-medium text-brand-700">
        ← Agencies
      </Link>
      <h1 className="mt-2 text-3xl font-bold">Driver board</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        Everyone driving for this agency, and applicants working through
        onboarding. Approve an applicant only after every required document
        reads Verified — approval puts them on the road.
      </p>
      <div className="mt-1 flex gap-4">
        <Link
          href={`/agencies/${id}/dispatch`}
          className="text-sm font-medium text-brand-700"
        >
          Open dispatch →
        </Link>
        <Link
          href={`/agencies/${id}/documents`}
          className="text-sm font-medium text-brand-700"
        >
          Review documents →
        </Link>
        <Link
          href={`/agencies/${id}/vehicles`}
          className="text-sm font-medium text-brand-700"
        >
          Manage fleet →
        </Link>
      </div>
      <p className="mt-1 font-mono text-xs text-slate-500">{id}</p>
      <Card className="mt-8 overflow-hidden p-0">
        <DriverBoardList drivers={drivers} />
      </Card>
    </main>
  );
}
