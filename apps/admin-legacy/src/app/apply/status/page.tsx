import { Badge, Btn, Card, Field, PageHeader, inputCls } from "../../ui";
import { listApplicationsByEmail } from "@/lib/agency";

export default async function ApplyStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const apps = email ? await listApplicationsByEmail(email) : [];
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 pt-10">
      <PageHeader title="Application status" />
      <Card>
        <form method="GET" className="flex items-end gap-2">
          <div className="flex-1">
            <Field label="Signup email">
              <input
                name="email"
                type="email"
                required
                defaultValue={email ?? ""}
                className={inputCls}
              />
            </Field>
          </div>
          <Btn type="submit">Look up</Btn>
        </form>
      </Card>
      {email && (
        <Card>
          {apps.length === 0 ? (
            <p className="text-sm text-zinc-500">No applications for {email}.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {apps.map((a) => (
                <li key={a.id} className="flex items-center justify-between text-sm">
                  <span>
                    <span className="font-medium">{a.businessName}</span>
                    <span className="block font-mono text-xs text-zinc-500 tabular-nums">
                      {a.id}
                    </span>
                  </span>
                  <Badge
                    tone={a.status === "approved" ? "ok" : a.status === "rejected" ? "bad" : "warn"}
                  >
                    {a.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
