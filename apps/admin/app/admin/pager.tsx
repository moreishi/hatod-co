import Link from "next/link";

const PAGE_SIZE = 25;

/** Prev/Next pager driven by ?page=. Shows Next while a full page arrived. */
export function Pager({
  base,
  page,
  fullPage,
}: {
  base: string;
  page: number;
  fullPage: boolean;
}) {
  return (
    <div className="mt-6 flex items-center gap-3 text-sm">
      {page > 1 ? (
        <Link
          href={`${base}${base.includes("?") ? "&" : "?"}page=${page - 1}`}
          className="rounded-lg border border-slate-300 px-3 py-1"
        >
          ← Prev
        </Link>
      ) : (
        <span className="rounded-lg border border-slate-100 px-3 py-1 text-slate-300">
          ← Prev
        </span>
      )}
      <span className="text-slate-500">Page {page}</span>
      {fullPage ? (
        <Link
          href={`${base}${base.includes("?") ? "&" : "?"}page=${page + 1}`}
          className="rounded-lg border border-slate-300 px-3 py-1"
        >
          Next →
        </Link>
      ) : (
        <span className="rounded-lg border border-slate-100 px-3 py-1 text-slate-300">
          Next →
        </span>
      )}
    </div>
  );
}

export { PAGE_SIZE };
