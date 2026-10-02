import { NextResponse } from "next/server";
import { apiAsUser } from "@/lib/api.js";

export async function GET() {
  try {
    // Super-admins see every agency through the membership scope.
    return NextResponse.json(await apiAsUser("/api/agencies/mine"));
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "API error" },
      { status: 401 },
    );
  }
}

export async function POST(req: Request) {
  const { name, slug, cityCode, contactPhone } = (await req.json()) as {
    name?: string;
    slug?: string;
    cityCode?: string;
    contactPhone?: string;
  };
  if (!name || !cityCode || !contactPhone) {
    return NextResponse.json(
      { message: "name, cityCode, and contactPhone required" },
      { status: 400 },
    );
  }
  try {
    const body = await apiAsUser("/api/agencies", {
      method: "POST",
      body: JSON.stringify({ name, slug, cityCode, contactPhone }),
    });
    return NextResponse.json(body);
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "API error" },
      { status: 403 },
    );
  }
}
