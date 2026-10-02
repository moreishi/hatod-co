import { NextResponse } from "next/server";
import { apiAsUser } from "@/lib/api.js";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    return NextResponse.json(await apiAsUser(`/api/agencies/${id}/vehicles`));
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "API error" },
      { status: 401 },
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { plateNo, type, make, model, year } = (await req.json()) as {
    plateNo?: string;
    type?: string;
    make?: string;
    model?: string;
    year?: number;
  };
  if (!plateNo || !type) {
    return NextResponse.json(
      { message: "plateNo and type required" },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(
      await apiAsUser(`/api/agencies/${id}/vehicles`, {
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
