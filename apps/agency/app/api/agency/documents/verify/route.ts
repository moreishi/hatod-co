import { NextResponse } from "next/server";
import { apiAsUser } from "@/lib/api.js";

export async function POST(req: Request) {
  const { documentId, status } = (await req.json()) as {
    documentId?: string;
    status?: string;
  };
  if (!documentId || !status) {
    return NextResponse.json(
      { message: "documentId and status required" },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(
      await apiAsUser(`/onboarding/documents/${documentId}/verify`, {
        method: "POST",
        body: JSON.stringify({ status }),
      }),
    );
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "API error" },
      { status: 400 },
    );
  }
}
