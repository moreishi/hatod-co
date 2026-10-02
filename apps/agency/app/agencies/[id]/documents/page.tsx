import Link from "next/link";
import { agencyDocuments } from "@/lib/api.js";
import { humanStatus } from "@/lib/status.js";
import { ReviewQueue } from "./review-queue.js";

const PAGE_SIZE = 20;
const TABS = ["PENDING", "VERIFIED", "REJECTED"] as const;

function href(
  id: string,
  opts: { status?: string; q?: string; page?: number },
) {
  const params = new URLSearchParams();
  if (opts.status) params.set("status", opts.status);
  if (opts.q) params.set("q", opts.q);
  if (opts.page && opts.page > 1) params.set("page", String(opts.page));
  const query = params.toString();
  return `/agencies/${id}/documents${query ? `?${query}` : ""}`;
}

export default async function DocumentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const { id } = await params;
  const { status, q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const docs = await agencyDocuments(id, {
    status,
    q,
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <Link
        href={`/agencies/${id}`}
        className="text-sm font-medium text-brand-700"
      >
        ← Driver board
      </Link>
      <h1 className="mt-2 text-3xl font-bold">Document review</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        Open each photo and check it is legible and belongs to the applicant.
        Verify passes it; Reject needs a reason, which the driver sees. Drivers
        move forward once every required document reads Verified.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Link
          href={href(id, { q })}
          className={`rounded-full px-3 py-1 text-xs ${!status ? "bg-brand-700 text-white" : "border bg-white text-slate-600"}`}
        >
          All
        </Link>
        {TABS.map((tab) => (
          <Link
            key={tab}
            href={href(id, { status: tab, q })}
            title={tab}
            className={`rounded-full px-3 py-1 text-xs ${status === tab ? "bg-brand-700 text-white" : "border bg-white text-slate-600"}`}
          >
            {humanStatus(tab)}
          </Link>
        ))}
        <form
          method="get"
          action={`/agencies/${id}/documents`}
          className="ml-auto flex gap-2"
        >
          {status && <input type="hidden" name="status" value={status} />}
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search driver, phone, or type…"
            className="w-56 rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white"
          >
            Search
          </button>
          {q && (
            <Link
              href={href(id, { status })}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              Clear
            </Link>
          )}
        </form>
      </div>
      <ReviewQueue docs={docs} />
      <div className="mt-4 flex items-center gap-3 text-sm">
        {page > 1 && (
          <Link
            href={href(id, { status, q, page: page - 1 })}
            className="rounded-lg border bg-white px-3 py-1"
          >
            ← Newer
          </Link>
        )}
        <span className="text-slate-500">Page {page}</span>
        {docs.length === PAGE_SIZE && (
          <Link
            href={href(id, { status, q, page: page + 1 })}
            className="rounded-lg border bg-white px-3 py-1"
          >
            Older →
          </Link>
        )}
      </div>
    </main>
  );
}
