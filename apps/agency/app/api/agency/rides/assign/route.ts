import { NextResponse } from "next/server";
import { apiAsUser } from "@/lib/api.js";

export async function POST(req: Request) {
  const { rideId, driverId } = (await req.json()) as {
    rideId?: string;
    driverId?: string;
  };
  if (!rideId || !driverId) {
    return NextResponse.json(
      { message: "rideId and driverId required" },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(
      await apiAsUser(`/rides/${rideId}/assign`, {
        method: "POST",
        body: JSON.stringify({ driverId }),
      }),
    );
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "API error" },
      { status: 400 },
    );
  }
}
