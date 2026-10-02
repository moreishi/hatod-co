import { NextResponse } from "next/server";
import { apiAsUser } from "@/lib/api.js";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { contactPhone, cityCode, status } = (await req.json()) as {
    contactPhone?: string;
    cityCode?: string;
    status?: string;
  };
  try {
    return NextResponse.json(
      await apiAsUser(`/api/agencies/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ contactPhone, cityCode, status }),
      }),
    );
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "API error" },
      { status: 403 },
    );
  }
}
