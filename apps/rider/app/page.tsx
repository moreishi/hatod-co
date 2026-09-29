import { BookingForm } from "./booking-form.js";

export default function RiderHome() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">
        Hailing · Rider
      </p>
      <h1 className="mt-2 text-4xl font-bold text-brand-900">Where to?</h1>
      <BookingForm />
    </main>
  );
}
