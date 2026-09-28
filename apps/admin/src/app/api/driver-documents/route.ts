import { auth } from "@/auth";
import { isStaff, type Role } from "@/lib/access";
import { addDriverDocument } from "@/lib/driverDocs";
import { canManageDriver, getDriver, getDriverByUser } from "@/lib/drivers";
import { buildDocKey, checkUpload, getStorage } from "@/lib/storage";

function sniff(contentType: string, bytes: Uint8Array): boolean {
  if (contentType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8;
  if (contentType === "image/png")
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e;
  if (contentType === "application/pdf")
    return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  return false;
}

export async function POST(req: Request) {
  const session = await auth();
  const u = session?.user as { id?: string; roles?: Role[] } | undefined;
  const roles = u?.roles ?? [];
  if (!u?.id || roles.length === 0) return Response.json({ error: "signed in" }, { status: 401 });

  const form = await req.formData();
  const driverId = String(form.get("driverId") ?? "");
  const type = String(form.get("type") ?? "");
  const expiryDate = String(form.get("expiryDate") ?? "") || undefined;
  const file = form.get("file");
  if (!driverId || !(file instanceof File))
    return Response.json({ error: "driverId and file required" }, { status: 400 });

  // Scope: staff anywhere; agency its own fleet; driver their own profile.
  const staff = roles.some((r) => isStaff(r));
  let allowed = staff;
  if (!staff) {
    const mine = await getDriverByUser(u.id);
    if (mine && mine.id === driverId) allowed = true;
    else {
      const d = await getDriver(driverId);
      if (d && canManageDriver(roles, u.id, d)) allowed = true;
    }
  }
  if (!allowed) return Response.json({ error: "forbidden" }, { status: 403 });

  const contentType = file.type || "application/octet-stream";
  const gate = checkUpload(contentType, file.size);
  if (!gate.ok) return Response.json({ error: gate.reason }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!sniff(contentType, bytes))
    return Response.json({ error: "file content does not match its type" }, { status: 400 });

  try {
    const key = buildDocKey(driverId, type, file.name, contentType);
    await getStorage().put(key, bytes, contentType);
    const doc = await addDriverDocument(driverId, type, key, expiryDate);
    return Response.json({ id: doc.id, status: doc.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "upload failed";
    const status = /unknown document|expiry|content type|driver id/i.test(message) ? 400 : 500;
    return Response.json({ error: message }, { status });
  }
}
