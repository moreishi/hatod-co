import { Btn, Card, Field, PageHeader, inputCls } from "../ui";
import { signupAgencyAction } from "./actions";
import { LocationFields } from "./location-fields";

export default function ApplyPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 pt-10">
      <PageHeader title="Become a Hatod agency partner" />
      <p className="-mt-2 text-sm text-zinc-500">
        Run your own fleet in Gensan. Apply with your business details — operations reviews
        within 2 working days, then guides you through onboarding.
      </p>
      <Card>
        <form action={signupAgencyAction} className="flex flex-col gap-3">
          <Field label="Your name">
            <input name="name" required autoComplete="name" className={inputCls} />
          </Field>
          <Field label="Email (your login)">
            <input name="email" type="email" required autoComplete="email" className={inputCls} />
          </Field>
          <Field label="Business name">
            <input name="businessName" required placeholder="Gensan Fleet Co" className={inputCls} />
          </Field>
          <Field label="Contact phone (also your login)">
            <input name="contactPhone" required placeholder="09171110011" className={inputCls} />
          </Field>
          <LocationFields />
          <Btn tone="primary" type="submit" className="py-2 text-sm">
            Submit application
          </Btn>
        </form>
      </Card>
      <p className="text-center text-xs text-zinc-500">
        Already applied? <a href="/apply/status" className="underline">Check your status</a>
      </p>
    </div>
  );
}
