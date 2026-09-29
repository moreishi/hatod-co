import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isStaff, type Role } from "@/lib/access";
import { ONBOARDING_STEPS, STEP_LABELS, canGoLive, getOnboarding, listMyApplications } from "@/lib/agency";
import { Badge, Card, PageHeader } from "../../ui";

export default async function MyAgencyPage() {
  const session = await auth();
  const u = session?.user as { id?: string; roles?: Role[] } | undefined;
  const roles = u?.roles ?? [];
  if (roles.some((r) => isStaff(r))) redirect("/fleet");
  if (!roles.includes("agency") || !u?.id) redirect("/no-access");
  const apps = await listMyApplications(u.id);
  const states = await Promise.all(apps.map((a) => getOnboarding(a.id)));
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="My agency application" badge={<Badge tone="info">agency</Badge>} />
      {apps.length === 0 && (
        <Card>
          <p className="text-sm text-zinc-500">
            No application on this account yet. <a href="/apply" className="underline">Apply here</a>.
          </p>
        </Card>
      )}
      {apps.map((a, i) => {
        const state = states[i];
        const live = canGoLive(state);
        return (
          <Card key={a.id}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="font-semibold">{a.businessName}</h2>
              <Badge tone={a.status === "approved" ? "ok" : a.status === "rejected" ? "bad" : "warn"}>
                {a.status}
              </Badge>
            </div>
            <p className="mb-2 font-mono text-xs text-zinc-500 tabular-nums">{a.id}</p>
            <p className="mb-2 text-sm text-zinc-600 tabular-nums">
              {a.city}, {a.province} · {a.country}
            </p>
            {a.status === "approved" && (
              <>
                <ol className="flex flex-col gap-1 text-sm">
                  {ONBOARDING_STEPS.map((step, n) => {
                    const done = state.done.includes(step);
                    return (
                      <li key={step} className={done ? "text-zinc-400 line-through" : ""}>
                        {n + 1}. {STEP_LABELS[step]} {done ? "✓" : ""}
                      </li>
                    );
                  })}
                </ol>
                {live && (
                  <p className="mt-2 text-sm font-medium text-brand-700">
                    Onboarding complete — ready for go-live. Operations will be in touch.
                  </p>
                )}
              </>
            )}
            {a.status === "pending" && (
              <p className="text-sm text-zinc-500">
                Under review — operations responds within 2 working days.
              </p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
