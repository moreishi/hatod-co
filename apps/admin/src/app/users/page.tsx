import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ROLES, canManageUsers, type Role } from "@/lib/access";
import { listUsersPaged } from "@/lib/users";
import { Badge, Btn, Card, Field, PageHeader, inputCls } from "../ui";
import { UserTable } from "./table";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; page?: string }>;
}) {
  const session = await auth();
  const role = (session?.user as { role?: Role } | undefined)?.role;
  if (!role || !canManageUsers(role)) redirect("/");
  const { q = "", role: rf = "", page = "1" } = await searchParams;
  const { rows, total, page: safe, pages } = await listUsersPaged(q, rf, Number(page) || 1);
  const qs = (over: Record<string, string>) =>
    new URLSearchParams({ q, role: rf, page: String(safe), ...over }).toString();
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Team — users & roles"
        badge={<Badge tone="info">{total} accounts · page {safe}/{pages}</Badge>}
      />
      <Card>
        <form method="GET" className="flex flex-wrap items-end gap-2">
          <div className="min-w-40 flex-1">
            <Field label="Search name, email, phone">
              <input
                name="q"
                defaultValue={q}
                placeholder="Ops, @hatod.co, 0917…"
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Role">
            <select name="role" defaultValue={rf} className={inputCls}>
              <option value="">All roles</option>
              {ROLES.map((r: Role) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
          <input type="hidden" name="page" value="1" />
          <Btn type="submit">Search</Btn>
        </form>
      </Card>
      <UserTable
        initial={rows}
        prev={qs({ page: String(Math.max(1, safe - 1)) })}
        next={qs({ page: String(Math.min(pages, safe + 1)) })}
        safe={safe}
        pages={pages}
        total={total}
      />
    </div>
  );
}
