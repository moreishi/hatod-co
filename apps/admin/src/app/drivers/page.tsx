import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isStaff, type Role } from "@/lib/access";
import { listDriversPaged } from "@/lib/drivers";
import { OpsDriverTable } from "./table";
import { Badge, Btn, Card, Field, PageHeader, inputCls } from "../ui";

export default async function DriversPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await auth();
  const roles = (session?.user as { roles?: Role[] } | undefined)?.roles ?? [];
  if (!roles.some((r) => isStaff(r))) redirect("/no-access");
  const { q = "", page = "1" } = await searchParams;
  const { rows, total, page: safe, pages } = await listDriversPaged(q, Number(page) || 1);
  const qs = (p: number) => new URLSearchParams({ q, page: String(p) }).toString();
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Fleet — approval & status"
        badge={<Badge tone="info">{total} total · page {safe}/{pages}</Badge>}
      />
      <Card>
        <form method="GET" className="flex items-end gap-2">
          <div className="flex-1">
            <Field label="Search name, phone, plate, status">
              <input
                name="q"
                defaultValue={q}
                placeholder="Dela Cruz, MC-…, online…"
                className={inputCls}
              />
            </Field>
          </div>
          <input type="hidden" name="page" value="1" />
          <Btn type="submit">Search</Btn>
        </form>
      </Card>
      <OpsDriverTable
        initial={rows}
        prev={qs(Math.max(1, safe - 1))}
        next={qs(Math.min(pages, safe + 1))}
        safe={safe}
        pages={pages}
        total={total}
      />
    </div>
  );
}
