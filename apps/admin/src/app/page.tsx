import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { roleHome, type Role } from "@/lib/access";

/** Universal landing: signed-in users go to their role home. */
export default async function Index() {
  const session = await auth();
  const u = session?.user as { roles?: Role[] } | undefined;
  redirect(roleHome(u?.roles ?? []));
}
