import Link from "next/link";
import { apiAsUser, type AgencyDto } from "@/lib/api.js";
import { Card } from "@/components/ui/card.js";
import { AdminNav } from "../admin-nav.js";
import { AgencyForm } from "./agency-form.js";
import { AgencyRow } from "./agency-row.js";

export default async function AdminAgenciesPage() {
  const agencies = await apiAsUser<AgencyDto[]>("/api/agencies/mine");
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">
        Hailing · Admin
      </p>
      <AdminNav />
      <h1 className="mt-4 text-3xl font-bold">Agencies</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        Transport partners on the platform. New agencies open ACTIVE — staff,
        drivers, and vehicles are managed inside each agency portal afterwards.
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Create agency</h2>
        <AgencyForm />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">
          All agencies ({agencies.length})
        </h2>
        <Card className="mt-3 overflow-hidden p-0">
          <ul className="divide-y">
            {agencies.map((agency) => (
              <li key={agency.id}>
                <Link
                  href={`/admin/agencies/${agency.id}`}
                  className="block px-6 py-3 hover:bg-slate-50"
                >
                  <AgencyRow agency={agency} />
                </Link>
              </li>
            ))}
            {agencies.length === 0 && (
              <li className="px-6 py-4 text-sm text-slate-500">
                No agencies yet.
              </li>
            )}
          </ul>
        </Card>
      </section>
    </main>
  );
}
