import { auth } from "@/auth";
import { isStaff, type Role } from "@/lib/access";
import { getDocument } from "@/lib/driverDocs";
import { canManageDriver, getDriver, getDriverByUser } from "@/lib/drivers";
import { getStorage } from "@/lib/storage";

/** Authenticated file serving — never a public folder. Same scope as upload. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const u = session?.user as { id?: string; roles?: Role[] } | undefined;
  const roles = u?.roles ?? [];
  if (!u?.id || roles.length === 0) return Response.json({ error: "signed in" }, { status: 401 });

  const { id } = await params;
  const doc = await getDocument(id);
  if (!doc) return Response.json({ error: "not found" }, { status: 404 });

  const staff = roles.some((r) => isStaff(r));
  let allowed = staff;
  if (!staff) {
    const mine = await getDriverByUser(u.id);
    if (mine && mine.id === doc.driverId) allowed = true;
    else {
      const d = await getDriver(doc.driverId);
      if (d && canManageDriver(roles, u.id, d)) allowed = true;
    }
  }
  if (!allowed) return Response.json({ error: "forbidden" }, { status: 403 });

  const { bytes, contentType } = await getStorage().get(doc.fileKey);
  return new Response(bytes as BodyInit, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${doc.type}"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
