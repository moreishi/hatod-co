import { listRidersPaged } from "@/lib/riders";
import { hasDb } from "@/lib/db";
import { RiderTable } from "./table";
import { Badge, Btn, Card, Field, PageHeader, inputCls } from "../ui";

export default async function RidersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = "", page = "1" } = await searchParams;
  const { rows, total, page: safe, pages } = await listRidersPaged(q, Number(page) || 1);
  const qs = (p: number) =>
    new URLSearchParams({ q, page: String(p) }).toString();
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Riders — accounts"
        badge={<Badge tone="info">{total} total · page {safe}/{pages}</Badge>}
      />
      <Card>
        <form method="GET" className="flex items-end gap-2">
          <div className="flex-1">
            <Field label="Search name, email, phone">
              <input
                name="q"
                defaultValue={q}
                placeholder="Garcia, @example.ph, 0917…"
                className={inputCls}
              />
            </Field>
          </div>
          <input type="hidden" name="page" value="1" />
          <Btn type="submit">Search</Btn>
        </form>
      </Card>
      <RiderTable
        initial={rows}
        live={hasDb()}
        prev={qs(Math.max(1, safe - 1))}
        next={qs(Math.min(pages, safe + 1))}
        safe={safe}
        pages={pages}
        total={total}
      />
    </div>
  );
}
