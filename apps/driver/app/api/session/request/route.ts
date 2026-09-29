import { NextResponse } from "next/server";

const API_URL = process.env.HAILING_API_URL ?? "http://localhost:3001";

export async function POST(req: Request) {
  const { phone } = (await req.json()) as { phone?: string };
  if (!phone)
    return NextResponse.json({ message: "phone required" }, { status: 400 });
  const res = await fetch(`${API_URL}/api/auth/otp/request`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  const body = await res.json();
  return NextResponse.json(body, { status: res.status });
}
