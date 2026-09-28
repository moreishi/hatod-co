import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isStaff, type Role } from "@/lib/access";
import { getDriver } from "@/lib/drivers";
import { canManageDriver } from "@/lib/drivers";
import { listDriverDocuments } from "@/lib/driverDocs";
import { Badge, Btn, Card, Field, PageHeader, inputCls } from "../../../ui";
import { offboardDriverAction, reviewDocumentAction, updateFleetDriverAction } from "../../actions";

export default async function FleetDriverDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const u = session?.user as { id?: string; roles?: Role[] } | undefined;
  const roles = u?.roles ?? [];
  const staff = roles.some((r) => isStaff(r));
  if (!staff && !roles.includes("agency")) redirect("/no-access");
  const { id } = await params;
  const d = await getDriver(id);
  if (!d || !canManageDriver(roles, u?.id ?? "", d)) redirect("/fleet/drivers");
  const docs = await listDriverDocuments(id);
  const pending = docs.filter((x) => x.status === "pending").length;
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={`${d.name} — documents`}
        badge={<Badge tone={pending > 0 ? "warn" : "ok"}>{pending} pending</Badge>}
      />
      <Card>
        <p className="text-sm">
          {d.vehicleType} · {d.plateNo} · <span className="tabular-nums">{d.phone}</span>
        </p>
      </Card>
      <Card>
        <h2 className="mb-2 font-semibold">Edit profile</h2>
        <form
          action={updateFleetDriverAction.bind(null, d.id)}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          <Field label="Name">
            <input name="name" required defaultValue={d.name} className={inputCls} />
          </Field>
          <Field label="Phone">
            <input name="phone" required defaultValue={d.phone} className={inputCls} />
          </Field>
          <Field label="Vehicle">
            <select name="vehicleType" defaultValue={d.vehicleType} className={inputCls}>
              {["moto", "trike", "sedan", "suv"].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Plate no">
            <input name="plateNo" required defaultValue={d.plateNo} className={inputCls} />
          </Field>
          <Field label="PA expiry">
            <input name="paExpiry" type="date" required defaultValue={d.docs.paExpiry} className={inputCls} />
          </Field>
          <Field label="CPC expiry">
            <input name="cpcExpiry" type="date" required defaultValue={d.docs.cpcExpiry} className={inputCls} />
          </Field>
          <Field label="License no">
            <input name="licenseNo" required defaultValue={d.docs.licenseNo} className={inputCls} />
          </Field>
          <div className="flex items-end">
            <Btn tone="primary" type="submit">
              Save changes
            </Btn>
          </div>
        </form>
      </Card>
      <Card>
        <h2 className="mb-1 font-semibold text-red-700">Offboard driver</h2>
        <p className="mb-2 text-xs text-zinc-500">
          Allowed only with zero trips — history is never deleted. Docs and profile go with it.
        </p>
        <form action={offboardDriverAction.bind(null, d.id)} className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" required className="accent-red-600" /> I understand
          </label>
          <Btn tone="danger" type="submit">
            Offboard
          </Btn>
        </form>
      </Card>
      <Card flush>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Expiry</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {docs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-zinc-500">
                    No uploads yet.
                  </td>
                </tr>
              )}
              {docs.map((doc) => (
                <tr key={doc.id} className="hover:bg-zinc-50/60">
                  <td className="px-4 py-2 font-medium">{doc.type}</td>
                  <td className="px-4 py-2 tabular-nums">{doc.expiryDate ?? "—"}</td>
                  <td className="px-4 py-2">
                    <a href={`/api/driver-documents/${doc.id}`} target="_blank" rel="noreferrer">
                      <Badge
                        tone={doc.status === "verified" ? "ok" : doc.status === "rejected" ? "bad" : "warn"}
                      >
                        {doc.status} · view
                      </Badge>
                    </a>
                  </td>
                  <td className="px-4 py-2">
                    {doc.status === "pending" ? (
                      <form action={reviewDocumentAction.bind(null, doc.id, "verified")} className="inline">
                        <Btn tone="primary" type="submit">
                          Verify
                        </Btn>
                      </form>
                    ) : (
                      <span className="text-xs text-zinc-400">decided</span>
                    )}
                    {doc.status === "pending" && (
                      <form
                        action={reviewDocumentAction.bind(null, doc.id, "rejected")}
                        className="ml-2 inline"
                      >
                        <Btn tone="danger" type="submit">
                          Reject
                        </Btn>
                      </form>
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
