import { LoginForm } from "./login-form.js";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-24">
      <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">
        Hailing · Agency
      </p>
      <h1 className="mt-2 text-3xl font-bold">Fleet sign in</h1>
      <p className="mt-2 text-slate-600">
        Phone number + one-time code for agency staff.
      </p>
      <LoginForm />
    </main>
  );
}
