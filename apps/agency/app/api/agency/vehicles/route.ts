import { NextResponse } from "next/server";
import { apiAsUser } from "@/lib/api.js";

export async function POST(req: Request) {
  const { agencyId, plateNo, type, make, model, year } = (await req.json()) as {
    agencyId?: string;
    plateNo?: string;
    type?: string;
    make?: string;
    model?: string;
    year?: number;
  };
  if (!agencyId || !plateNo || !type) {
    return NextResponse.json(
      { message: "agencyId, plateNo and type required" },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(
      await apiAsUser(`/agencies/${agencyId}/vehicles`, {
        method: "POST",
        body: JSON.stringify({ plateNo, type, make, model, year }),
      }),
    );
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "API error" },
      { status: 400 },
    );
  }
}
