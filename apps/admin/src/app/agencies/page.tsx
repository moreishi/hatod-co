import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canReviewAgency, type Role } from "@/lib/access";
import { getOnboarding, listApplicationsPaged, type OnboardingState } from "@/lib/agency";
import { Badge, Btn, Card, Field, PageHeader, inputCls } from "../ui";
import { DecideButtons, OnboardingTracker } from "./controls";

const STATUSES = ["", "pending", "approved", "rejected"];

export default async function AgencyPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const session = await auth();
  const roles = (session?.user as { roles?: Role[] })?.roles ?? [];
  if (!roles.some((r) => canReviewAgency(r))) redirect("/no-access");
  const { q = "", status = "", page = "1" } = await searchParams;
  const { rows: apps, total, page: safe, pages } = await listApplicationsPaged(
    q,
    status,
    Number(page) || 1,
  );
  const states: OnboardingState[] = await Promise.all(
    apps.filter((a) => a.status === "approved").map((a) => getOnboarding(a.id)),
  );
  const byApp = new Map<string, OnboardingState>();
  for (const s of states) byApp.set(s.applicationId, s);
  const qs = (over: Record<string, string>) =>
    new URLSearchParams({ q, status, page: String(safe), ...over }).toString();
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Agency applications"
        badge={<Badge tone="info">{total} total · page {safe}/{pages}</Badge>}
      />
      <Card>
        <form method="GET" className="flex flex-wrap items-end gap-2">
          <div className="min-w-40 flex-1">
            <Field label="Search business, phone, email">
              <input
                name="q"
                defaultValue={q}
                placeholder="Fleet Co, 0917…, @…, city…"
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Status">
            <select name="status" defaultValue={status} className={inputCls}>
              <option value="">All</option>
              {STATUSES.filter(Boolean).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <input type="hidden" name="page" value="1" />
          <Btn type="submit">Search</Btn>
        </form>
      </Card>
      <Card flush>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2">Business</th>
                <th className="px-4 py-2">Area</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {apps.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-zinc-500">
                    No applications match.
                  </td>
                </tr>
              )}
              {apps.map((a) => (
                <tr key={a.id} className="hover:bg-zinc-50/60">
                  <td className="px-4 py-2">
                    <p className="font-medium">{a.businessName}</p>
                    <p className="text-xs text-zinc-500 tabular-nums">{a.id}</p>
                    {a.applicantEmail && (
                      <p className="text-xs text-zinc-500">{a.applicantEmail}</p>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {a.city}
                    <span className="block text-zinc-500">
                      {a.province} · {a.country}
                    </span>
                  </td>
                  <td className="px-4 py-2 tabular-nums">{a.contactPhone}</td>
                  <td className="px-4 py-2">
                    <Badge
                      tone={
                        a.status === "approved"
                          ? "ok"
                          : a.status === "rejected"
                            ? "bad"
                            : "warn"
                      }
                    >
                      {a.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
                    {a.status === "pending" ? (
                      <DecideButtons id={a.id} />
                    ) : a.status === "approved" && byApp.get(a.id) ? (
                      <OnboardingTracker state={byApp.get(a.id)!} />
                    ) : (
                      <span className="text-xs text-zinc-400">decided</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-2 text-sm">
          <a
            href={`/agencies?${qs({ page: String(Math.max(1, safe - 1)) })}`}
            aria-disabled={safe <= 1}
            className={safe <= 1 ? "pointer-events-none text-zinc-300" : "underline"}
          >
            ← Prev
          </a>
          <span className="text-xs text-zinc-500 tabular-nums">
            Page {safe} of {pages} · {total} total
          </span>
          <a
            href={`/agencies?${qs({ page: String(Math.min(pages, safe + 1)) })}`}
            aria-disabled={safe >= pages}
            className={safe >= pages ? "pointer-events-none text-zinc-300" : "underline"}
          >
            Next →
          </a>
        </div>
      </Card>
    </div>
  );
}
