"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { canManageUsers, type Role } from "@/lib/access";
import { queryDb } from "@/lib/db";
import { adjustWallet, type AdjustDirection } from "@/lib/wallet";

async function superadmin() {
  const session = await auth();
  const roles = (session?.user as { roles?: Role[] } | undefined)?.roles ?? [];
  if (!roles.some((r) => canManageUsers(r))) throw new Error("superadmin only");
  const id = (session?.user as { id?: string })?.id ?? "";
  return { id };
}

/** Superadmin credit/debit by email. Every move is an `adjustment` record. */
export async function adjustWalletAction(formData: FormData) {
  const { id } = await superadmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const direction = String(formData.get("direction") ?? "credit") as AdjustDirection;
  if (direction !== "credit" && direction !== "debit") throw new Error("bad direction");
  const pesos = Number(formData.get("amount") ?? 0);
  const rows = await queryDb<{ id: string }>("SELECT id FROM users WHERE email = $1", [email]);
  if (rows.length === 0) throw new Error("unknown email");
  await adjustWallet(rows[0].id, direction, pesos, id, formData.get("memo"));
  revalidatePath("/wallets");
}
