import { NextResponse } from "next/server";
import { apiAsUser } from "@/lib/api.js";

export async function POST(req: Request) {
  try {
    return NextResponse.json(
      await apiAsUser("/api/rides/quote", {
        method: "POST",
        body: await req.text(),
      }),
    );
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "API error" },
      { status: 400 },
    );
  }
}
