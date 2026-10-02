import { apiAsUser } from "@/lib/api.js";
import { Card } from "@/components/ui/card.js";
import { AdminNav } from "../admin-nav.js";
import { FareEditor } from "./fare-editor.js";

interface PlatformConfig {
  schedule: { id: string; name: string } | null;
  pricing: {
    currency: string;
    baseFareCentavos: number;
    minimumFareCentavos: number;
    perKmCentavos: Record<string, number>;
  };
  matching: {
    radiusKm: number;
    offerTimeoutSec: number;
    pingFreshSec: number;
  };
  routingProvider: string;
  environment: string;
}

export default async function AdminSettingsPage() {
  const config = await apiAsUser<PlatformConfig>("/api/admin/config");
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <AdminNav />
      <h1 className="mt-4 text-3xl font-bold">Settings</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        Live platform knobs, exactly as the API serves them. Publishing a fare
        schedule reprices every quote within 30 seconds.
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Matching &amp; routing</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <p className="font-mono text-xs text-slate-500">MATCH RADIUS</p>
            <p className="mt-1 text-xl font-bold">
              {config.matching.radiusKm} km
            </p>
          </Card>
          <Card className="p-4">
            <p className="font-mono text-xs text-slate-500">OFFER TIMEOUT</p>
            <p className="mt-1 text-xl font-bold">
              {config.matching.offerTimeoutSec}s
            </p>
          </Card>
          <Card className="p-4">
            <p className="font-mono text-xs text-slate-500">PING FRESHNESS</p>
            <p className="mt-1 text-xl font-bold">
              {config.matching.pingFreshSec}s
            </p>
          </Card>
          <Card className="p-4">
            <p className="font-mono text-xs text-slate-500">ROUTING</p>
            <p className="mt-1 text-xl font-bold">{config.routingProvider}</p>
            <p className="text-xs text-slate-500">{config.environment}</p>
          </Card>
        </div>
      </section>

      <FareEditor
        initial={{
          name: config.schedule?.name ?? "pilot",
          baseFareCentavos: config.pricing.baseFareCentavos,
          minimumFareCentavos: config.pricing.minimumFareCentavos,
          perKmCentavos: config.pricing.perKmCentavos,
        }}
        activeName={config.schedule?.name ?? null}
      />
    </main>
  );
}
