import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/session.js";
import { LogoutButton } from "./logout-button.js";

export default async function MePage() {
  const token = (await cookies()).get("hailing_session")?.value;
  const secret = process.env.JWT_SECRET ?? "localstage-only-dev-secret";
  let session;
  try {
    if (!token) throw new Error("no session");
    session = verifySession(token, secret);
  } catch {
    redirect("/login");
  }
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">
        Hailing · Admin
      </p>
      <h1 className="mt-2 text-3xl font-bold">Session</h1>
      <dl className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <dt className="text-sm text-slate-500">User ID</dt>
        <dd className="font-mono text-sm">{session.sub}</dd>
        <dt className="mt-4 text-sm text-slate-500">Roles</dt>
        <dd>
          <ul className="mt-1 flex flex-wrap gap-2">
            {session.roles.map((role) => (
              <li
                key={role}
                className="rounded-full bg-brand-50 px-3 py-1 font-mono text-xs text-brand-700"
              >
                {role}
              </li>
            ))}
          </ul>
        </dd>
      </dl>
      <div className="mt-6">
        <LogoutButton />
      </div>
    </main>
  );
}
