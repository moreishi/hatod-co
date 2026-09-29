import { AcceptForm } from "./accept-form.js";

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <main className="mx-auto max-w-md px-6 py-24">
      <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">
        Hailing · Admin invite
      </p>
      <h1 className="mt-2 text-3xl font-bold">Claim your admin account</h1>
      <p className="mt-2 text-slate-600">
        Set your phone number and password to activate.
      </p>
      <AcceptForm token={token} />
    </main>
  );
}
