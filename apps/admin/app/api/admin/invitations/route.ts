import { NextResponse } from "next/server";
import { apiAsUser } from "@/lib/api.js";

export async function GET() {
  try {
    return NextResponse.json(await apiAsUser("/api/admin/invitations"));
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "API error" },
      { status: 401 },
    );
  }
}

export async function POST(req: Request) {
  const { email, role } = (await req.json()) as {
    email?: string;
    role?: string;
  };
  if (!email || !role) {
    return NextResponse.json(
      { message: "email and role required" },
      { status: 400 },
    );
  }
  try {
    const body = await apiAsUser("/api/admin/invitations", {
      method: "POST",
      body: JSON.stringify({ email, role }),
    });
    return NextResponse.json(body);
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "API error" },
      { status: 403 },
    );
  }
}
