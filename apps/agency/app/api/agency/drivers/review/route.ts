import { NextResponse } from "next/server";
import { apiAsUser } from "@/lib/api.js";

export async function POST(req: Request) {
  const { driverId, action } = (await req.json()) as {
    driverId?: string;
    action?: string;
  };
  if (!driverId || !action) {
    return NextResponse.json(
      { message: "driverId and action required" },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(
      await apiAsUser(`/onboarding/drivers/${driverId}/review`, {
        method: "POST",
        body: JSON.stringify({ action }),
      }),
    );
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "API error" },
      { status: 400 },
    );
  }
}
