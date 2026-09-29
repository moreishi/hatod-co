import { NextResponse } from "next/server";
import { apiAsUser } from "@/lib/api.js";

export async function POST(req: Request) {
  const { online } = (await req.json()) as { online?: boolean };
  try {
    return NextResponse.json(
      await apiAsUser("/api/drivers/me/online", {
        method: "POST",
        body: JSON.stringify({ online: online === true }),
      }),
    );
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "API error" },
      { status: 400 },
    );
  }
}
