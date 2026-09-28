import { OtpLoginForm } from "../otp-form";

export default function LoginPage() {
  return (
    <OtpLoginForm
      title="Hatod Admin"
      subtitle="Gensan pilot ops — sign in with SMS code"
      fallbackNext="/"
      footer={
        <p className="text-center text-xs text-zinc-500">
          Fleet partner? <a href="/fleet/login" className="underline">Agency sign-in</a>
        </p>
      }
    />
  );
}
