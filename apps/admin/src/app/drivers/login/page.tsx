import { OtpLoginForm } from "../../otp-form";

export default function DriverLoginPage() {
  return (
    <OtpLoginForm
      title="Hatod Driver"
      subtitle="Driver sign-in — code by SMS"
      fallbackNext="/drivers/me"
    />
  );
}
