import { NextResponse } from "next/server";
import { apiAsUser } from "@/lib/api.js";

export async function POST(req: Request) {
  const { rideId, to, cancelReason } = (await req.json()) as {
    rideId?: string;
    to?: string;
    cancelReason?: string;
  };
  if (!rideId || !to) {
    return NextResponse.json(
      { message: "rideId and to required" },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(
      await apiAsUser(`/rides/${rideId}/transition`, {
        method: "POST",
        body: JSON.stringify({ to, cancelReason }),
      }),
    );
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "API error" },
      { status: 400 },
    );
  }
}
