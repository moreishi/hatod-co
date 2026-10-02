import { NextResponse } from "next/server";
import { apiAsUser } from "@/lib/api.js";

export async function POST(req: Request) {
  const { driverId, vehicleId } = (await req.json()) as {
    driverId?: string;
    vehicleId?: string;
  };
  if (!driverId || !vehicleId) {
    return NextResponse.json(
      { message: "driverId and vehicleId required" },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(
      await apiAsUser(`/api/agencies/drivers/${driverId}/assign-vehicle`, {
        method: "POST",
        body: JSON.stringify({ vehicleId }),
      }),
    );
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "API error" },
      { status: 400 },
    );
  }
}
