import { NextResponse } from "next/server";
import { apiAsUser } from "@/lib/api.js";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    name?: string;
    baseFareCentavos?: number;
    minimumFareCentavos?: number;
    perKmCentavos?: Record<string, number>;
    commissionTiers?: { minLifetimeRides: number; rateBps: number }[];
  };
  try {
    return NextResponse.json(
      await apiAsUser("/api/admin/fares/publish", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    );
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "API error" },
      { status: 400 },
    );
  }
}
