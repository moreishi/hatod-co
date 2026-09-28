import { listRiders } from "@/lib/riders";
import { RiderTable } from "./table";
import { Badge, PageHeader } from "../ui";

export default async function RidersPage() {
  const { riders, live } = await listRiders();
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Riders — accounts"
        badge={<Badge tone={live ? "ok" : "warn"}>{live ? "Postgres" : "SQLite dev"}</Badge>}
      />
      <RiderTable initial={riders} live={live} />
    </div>
  );
}
