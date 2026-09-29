import { Badge, Btn, Card, PageHeader } from "../../ui";

export default async function ApplyDonePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 pt-10">
      <PageHeader title="Application received" badge={<Badge tone="ok">pending review</Badge>} />
      <Card>
        <p className="text-sm">Your reference number:</p>
        <p className="mt-1 font-mono text-lg font-bold tabular-nums">{id ?? "—"}</p>
        <p className="mt-2 text-sm text-zinc-600">
          Save this reference. Operations reviews applications within 2 working days — you
          can follow progress on the status page.
        </p>
        <div className="mt-3">
          <a href="/apply/status">
            <Btn>Check status</Btn>
          </a>
        </div>
      </Card>
    </div>
  );
}
