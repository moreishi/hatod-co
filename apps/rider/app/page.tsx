import { BookingForm } from "./booking-form.js";
import { LogoutButton } from "./logout-button.js";

export default function RiderHome() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">
          Hailing A� Rider
        </p>
        <LogoutButton />
      </div>
      <h1 className="mt-2 text-4xl font-bold text-brand-900">Where to?</h1>
      <BookingForm />
    </main>
  );
}
