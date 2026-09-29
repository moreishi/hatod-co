import { NextResponse } from "next/server";
import { apiAsUser } from "@/lib/api.js";

/** Driver ride actions: accept, reject, or state transitions. */
export async function POST(req: Request) {
  const { rideId, action, to } = (await req.json()) as {
    rideId?: string;
    action?: "accept" | "reject" | "transition";
    to?: string;
  };
  if (!rideId || !action) {
    return NextResponse.json(
      { message: "rideId and action required" },
      { status: 400 },
    );
  }
  try {
    const path =
      action === "accept"
        ? `/api/rides/${rideId}/accept`
        : action === "reject"
          ? `/api/rides/${rideId}/reject`
          : `/api/rides/${rideId}/transition`;
    return NextResponse.json(
      await apiAsUser(path, {
        method: "POST",
        body: JSON.stringify(action === "transition" ? { to } : {}),
      }),
    );
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "API error" },
      { status: 400 },
    );
  }
}
