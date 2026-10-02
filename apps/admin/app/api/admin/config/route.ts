import { NextResponse } from "next/server";
import { apiAsUser } from "@/lib/api.js";

export async function GET() {
  try {
    return NextResponse.json(await apiAsUser("/api/admin/config"));
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "API error" },
      { status: 401 },
    );
  }
}
