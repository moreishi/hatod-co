import { NextResponse } from "next/server";
import { apiAsUser } from "@/lib/api.js";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId");
  if (!conversationId)
    return NextResponse.json(
      { message: "conversationId required" },
      { status: 400 },
    );
  try {
    return NextResponse.json(
      await apiAsUser(`/api/conversations/${conversationId}/messages?limit=30`),
    );
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "API error" },
      { status: 400 },
    );
  }
}

export async function POST(req: Request) {
  const { conversationId, content, clientMessageId } = (await req.json()) as {
    conversationId?: string;
    content?: string;
    clientMessageId?: string;
  };
  if (!conversationId || !content) {
    return NextResponse.json(
      { message: "conversationId and content required" },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(
      await apiAsUser(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content, clientMessageId }),
      }),
    );
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "API error" },
      { status: 400 },
    );
  }
}
