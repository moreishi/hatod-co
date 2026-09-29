import { AgencyRole } from "@hailing/constants";

const CARDS = [
  { title: "Drivers", body: "Onboard, verify documents, manage lifecycle." },
  { title: "Vehicles", body: "Fleet registry and driver assignments." },
  { title: "Dispatch", body: "Live ride board for the Cebu pilot zone." },
  { title: "Payouts", body: "Wallet ledger, top-ups, and payouts." },
] as const;

export default function AgencyHome() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">
        Hailing · Agency Portal
      </p>
      <h1 className="mt-2 text-4xl font-bold text-brand-900">
        Run your Cebu fleet
      </h1>
      <p className="mt-3 max-w-2xl text-slate-600">
        Agency roles supported: {Object.values(AgencyRole).join(" · ")}.
        Authentication (agency credentials + OTP + 2FA) and the operations
        modules land in the next slices.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {CARDS.map((card) => (
          <section
            key={card.title}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold">{card.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{card.body}</p>
            <p className="mt-3 inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
              Coming in Foundation v0.1
            </p>
          </section>
        ))}
      </div>
    </main>
  );
}
