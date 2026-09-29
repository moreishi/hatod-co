export default function NoAccess() {
  return (
    <main className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-2xl font-bold">No access</h1>
      <p className="mt-2 text-slate-600">
        This portal is for platform administrators. Your account does not carry
        an admin role.
      </p>
      <a href="/login" className="mt-6 inline-block font-medium text-brand-700">
        Back to login
      </a>
    </main>
  );
}
