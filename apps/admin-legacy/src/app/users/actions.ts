"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { canManageUsers, ROLES, type Role } from "@/lib/access";
import { createUser, deleteUser, setActive, setUserRoles, updateIdentity } from "@/lib/users";

async function actor() {
  const session = await auth();
  const role = (session?.user as { role?: Role } | undefined)?.role;
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!role || !canManageUsers(role)) throw new Error("superadmin only");
  return { id: id ?? "" };
}

export async function createUserAction(formData: FormData) {
  await actor();
  await createUser({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    role: String(formData.get("role") ?? "operations"),
  });
  revalidatePath("/users");
}

export async function setUserRolesAction(id: string, formData: FormData) {
  const { id: actorId } = await actor();
  const roles = formData.getAll("roles").map(String).filter((r) => ROLES.includes(r as Role));
  await setUserRoles(id, roles, actorId);
  revalidatePath("/users");
  revalidatePath(`/users/${id}`);
}

export async function updateIdentityAction(id: string, formData: FormData) {
  await actor();
  await updateIdentity(id, {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  });
  revalidatePath(`/users/${id}`);
  revalidatePath("/users");
}

export async function setActiveAction(id: string, active: boolean) {
  const { id: actorId } = await actor();
  await setActive(id, active, actorId);
  revalidatePath(`/users/${id}`);
  revalidatePath("/users");
}

export async function deleteUserAction(id: string) {
  const { id: actorId } = await actor();
  await deleteUser(id, actorId);
  revalidatePath("/users");
}
