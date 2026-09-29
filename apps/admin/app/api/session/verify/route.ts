import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api.js";

export async function POST(req: Request) {
  const { challengeId, code } = (await req.json()) as {
    challengeId?: string;
    code?: string;
  };
  if (!challengeId || !code) {
    return NextResponse.json(
      { message: "challengeId and code required" },
      { status: 400 },
    );
  }
  try {
    const body = (await apiFetch("/api/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ challengeId, code }),
    })) as { token: string };
    const res = NextResponse.json({ ok: true });
    res.cookies.set("hailing_session", body.token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 12 * 3600,
    });
    return res;
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "API error" },
      { status: 401 },
    );
  }
}
