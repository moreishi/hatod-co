import { NextResponse } from "next/server";

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("hailing_session");
  return res;
}
