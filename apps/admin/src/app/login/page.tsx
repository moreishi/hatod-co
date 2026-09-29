import { OtpLoginForm } from "../otp-form";

export default function LoginPage() {
  return (
    <OtpLoginForm
      title="Hatod"
      subtitle="One sign-in for riders, drivers, agencies, and ops — code by SMS"
      fallbackNext="/"
    />
  );
}
