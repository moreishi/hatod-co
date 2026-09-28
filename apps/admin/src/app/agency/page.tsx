import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canReviewAgency, type Role } from "@/lib/access";
import { getOnboarding, listApplications, type OnboardingState } from "@/lib/agency";
import { Badge, Card, PageHeader } from "../ui";
import { DecideButtons, OnboardingTracker } from "./controls";

export default async function AgencyPage() {
  const session = await auth();
  const roles = (session?.user as { roles?: Role[] })?.roles ?? [];
  if (!roles.some((r) => canReviewAgency(r))) redirect("/no-access");
  const apps = await listApplications();
  const pending = apps.filter((a) => a.status === "pending").length;
  const states: OnboardingState[] = await Promise.all(
    apps.filter((a) => a.status === "approved").map((a) => getOnboarding(a.id)),
  );
  const byApp = new Map<string, OnboardingState>();
  for (const s of states) byApp.set(s.applicationId, s);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Agency applications"
        badge={<Badge tone={pending > 0 ? "warn" : "ok"}>{pending} pending</Badge>}
      />
      <Card flush>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2">Business</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {apps.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-zinc-500">
                    No applications yet — users apply from the rider/driver apps.
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
      </Card>
    </div>
  );
}
