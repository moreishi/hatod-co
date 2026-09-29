import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api.js";

/** Public: no session needed — the invitation token is the credential. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const { phone, password } = (await req.json()) as {
    phone?: string;
    password?: string;
  };
  if (!phone || !password) {
    return NextResponse.json(
      { message: "phone and password required" },
      { status: 400 },
    );
  }
  try {
    const body = await apiFetch(`/api/admin/invitations/${token}/accept`, {
      method: "POST",
      body: JSON.stringify({ phone, password }),
    });
    return NextResponse.json(body);
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "API error" },
      { status: 400 },
    );
  }
}
