import { Btn, Card, Field, PageHeader, inputCls } from "../ui";
import { signupAgencyAction } from "./actions";

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
          <Field label="Country">
            <input name="country" defaultValue="Philippines" className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Province">
              <input name="province" required placeholder="South Cotabato" className={inputCls} />
            </Field>
            <Field label="City">
              <input name="city" required placeholder="General Santos" className={inputCls} />
            </Field>
          </div>
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
