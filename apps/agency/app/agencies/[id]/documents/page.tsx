import Link from "next/link";
import { agencyDocuments } from "@/lib/api.js";
import { ReviewQueue } from "./review-queue.js";

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [pending, decided] = await Promise.all([
    agencyDocuments(id, "PENDING"),
    agencyDocuments(id, undefined),
  ]);
  const history = decided.filter((d) => d.status !== "PENDING").slice(0, 20);
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <Link
        href={`/agencies/${id}`}
        className="text-sm font-medium text-brand-700"
      >
        ← Driver board
      </Link>
      <h1 className="mt-2 text-3xl font-bold">Document review</h1>
      <p className="mt-1 font-mono text-xs text-slate-500">{id}</p>
      <ReviewQueue pending={pending} history={history} />
    </main>
  );
}
