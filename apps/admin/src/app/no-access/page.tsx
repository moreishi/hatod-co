import Link from "next/link";
import { Btn, Card } from "../ui";

export default function NoAccessPage() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4 pt-16 text-center">
      <p className="font-sans text-xl font-bold">No admin access</p>
      <Card>
        <p className="text-sm text-zinc-600">
          Your account is valid, but its role is for the rider/driver apps — not the ops
          panel. Contact an administrator if this is wrong.
        </p>
        <div className="mt-3 flex justify-center gap-2">
          <Link href="/api/auth/signout">
            <Btn>Sign out</Btn>
          </Link>
        </div>
      </Card>
    </div>
  );
}
