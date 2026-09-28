"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { isStaff, type Role } from "@/lib/access";
import { canManageDriver, createDriver, createDriverLogin, getDriver, offboardDriver, setDriverStatus, updateDriver } from "@/lib/drivers";
import { getDocument, setDocumentStatus } from "@/lib/driverDocs";
import { recordPayout } from "@/lib/ledger";
import type { DriverStatus } from "@/lib/types";

interface Actor {
  id: string;
  roles: Role[];
  staff: boolean;
}

async function actor(): Promise<Actor> {
  const session = await auth();
  const u = session?.user as { id?: string; role?: Role; roles?: Role[] } | undefined;
  const roles = u?.roles ?? (u?.role ? [u.role] : []);
  if (roles.length === 0) throw new Error("signed in");
  return { id: u?.id ?? "", roles, staff: roles.some((r) => isStaff(r)) };
}

/** Agency users act within their own fleet; staff act anywhere. */
async function fleetId(requested: string | null, a: Actor): Promise<string | null> {
  if (a.staff) return requested;
  return a.id;
}

export async function onboardDriverAction(formData: FormData) {
  const a = await actor();
  await createDriver(
    {
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      vehicleType: String(formData.get("vehicleType") ?? ""),
      plateNo: String(formData.get("plateNo") ?? ""),
      paExpiry: String(formData.get("paExpiry") ?? ""),
      cpcExpiry: String(formData.get("cpcExpiry") ?? ""),
      licenseNo: String(formData.get("licenseNo") ?? ""),
    },
    await fleetId(null, a),
  );
  revalidatePath("/fleet/drivers");
}

export async function setFleetDriverStatusAction(id: string, status: DriverStatus) {
  const a = await actor();
  const d = await getDriver(id);
  if (!d) throw new Error("driver not found");
  if (!canManageDriver(a.roles, a.id, d)) throw new Error("not your fleet");
  await setDriverStatus(id, status);
  revalidatePath("/fleet/drivers");
}

/** Create a login for a fleet driver. Returns one-time credentials to relay. */
export async function createDriverLoginAction(id: string, email?: string) {
  const a = await actor();
  const d = await getDriver(id);
  if (!d) throw new Error("driver not found");
  if (!canManageDriver(a.roles, a.id, d)) throw new Error("not your fleet");
  const cred = await createDriverLogin(id, email || undefined);
  revalidatePath("/fleet/drivers");
  return cred;
}

/** Verify or reject an uploaded document. Scoped to the reviewer's fleet. */
export async function reviewDocumentAction(docId: string, status: "verified" | "rejected") {
  const a = await actor();
  const doc = await getDocument(docId);
  if (!doc) throw new Error("document not found");
  const d = await getDriver(doc.driverId);
  if (!d) throw new Error("driver not found");
  if (!canManageDriver(a.roles, a.id, d)) throw new Error("not your fleet");
  await setDocumentStatus(docId, status, a.id);
  revalidatePath(`/fleet/drivers/${doc.driverId}`);
}

async function scopedDriver(id: string, a: Actor) {
  const d = await getDriver(id);
  if (!d) throw new Error("driver not found");
  if (!canManageDriver(a.roles, a.id, d)) throw new Error("not your fleet");
  return d;
}

export async function updateFleetDriverAction(id: string, formData: FormData) {
  const a = await actor();
  await scopedDriver(id, a);
  await updateDriver(id, {
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    vehicleType: String(formData.get("vehicleType") ?? ""),
    plateNo: String(formData.get("plateNo") ?? ""),
    paExpiry: String(formData.get("paExpiry") ?? ""),
    cpcExpiry: String(formData.get("cpcExpiry") ?? ""),
    licenseNo: String(formData.get("licenseNo") ?? ""),
  });
  revalidatePath(`/fleet/drivers/${id}`);
}

export async function offboardDriverAction(id: string) {
  const a = await actor();
  await scopedDriver(id, a);
  await offboardDriver(id);
  revalidatePath("/fleet/drivers");
}

export async function recordPayoutAction(formData: FormData) {
  const a = await actor();
  if (a.staff) throw new Error("agency only");
  await recordPayout(
    a.id,
    String(formData.get("periodStart") ?? ""),
    String(formData.get("periodEnd") ?? ""),
    Number(formData.get("amount") ?? 0),
  );
  revalidatePath("/fleet/earnings");
}
