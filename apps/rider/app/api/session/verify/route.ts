import { NextResponse } from "next/server";

const API_URL = process.env.HAILING_API_URL ?? "http://localhost:3001";

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
  const res = await fetch(`${API_URL}/api/auth/otp/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ challengeId, code }),
  });
  const body = (await res.json()) as { token?: string; message?: string };
  if (!res.ok || !body.token) {
    return NextResponse.json(
      { message: body.message ?? "verify failed" },
      { status: 401 },
    );
  }
  const out = NextResponse.json({ ok: true });
  out.cookies.set("hailing_session", body.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 3600,
  });
  return out;
}
