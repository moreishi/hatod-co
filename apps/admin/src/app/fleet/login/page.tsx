import { OtpLoginForm } from "../../otp-form";

export default function FleetLoginPage() {
  return (
    <OtpLoginForm
      title="Hatod Fleet"
      subtitle="Agency sign-in — code by SMS"
      fallbackNext="/fleet"
      footer={
        <p className="text-center text-xs text-zinc-500">
          No account yet? <a href="/apply" className="underline">Apply as an agency</a>
        </p>
      }
    />
  );
}
