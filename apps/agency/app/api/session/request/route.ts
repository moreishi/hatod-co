import { NextResponse } from "next/server";
import { apiPublic } from "@/lib/api.js";

export async function POST(req: Request) {
  const { phone } = (await req.json()) as { phone?: string };
  if (!phone)
    return NextResponse.json({ message: "phone required" }, { status: 400 });
  try {
    return NextResponse.json(await apiPublic("/auth/otp/request", { phone }));
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "API error" },
      { status: 401 },
    );
  }
}
