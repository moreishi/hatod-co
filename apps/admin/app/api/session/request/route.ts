import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api.js";

export async function POST(req: Request) {
  const { phone } = (await req.json()) as { phone?: string };
  if (!phone)
    return NextResponse.json({ message: "phone required" }, { status: 400 });
  try {
    const body = await apiFetch("/api/auth/otp/request", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
    return NextResponse.json(body);
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "API error" },
      { status: 401 },
    );
  }
}
