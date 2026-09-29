import { apiAsUser } from "@/lib/api.js";
import { PAGE_SIZE, Pager } from "../pager.js";

interface AuditRow {
  id: string;
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const skip = (page - 1) * PAGE_SIZE;
  const rows = await apiAsUser<AuditRow[]>(
    `/api/admin/audit-logs?take=${PAGE_SIZE}&skip=${skip}`,
  );
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-3xl font-bold">Audit log</h1>
      <p className="mt-1 text-sm text-slate-500">
        Sensitive admin and financial operations.
      </p>
      <ul className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-3 px-6 py-3"
          >
            <div>
              <p className="font-mono text-sm">
                {row.action} · {row.entity}
              </p>
              <p className="font-mono text-xs text-slate-500">
                {row.entityId.slice(0, 12)} · actor{" "}
                {row.actorId?.slice(0, 8) ?? "system"}
              </p>
            </div>
            <span className="font-mono text-xs text-slate-500">
              {new Date(row.createdAt).toLocaleString()}
            </span>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="px-6 py-4 text-sm text-slate-500">
            No audit entries yet.
          </li>
        )}
      </ul>
      <Pager
        base="/admin/audit"
        page={page}
        fullPage={rows.length === PAGE_SIZE}
      />
    </main>
  );
}
