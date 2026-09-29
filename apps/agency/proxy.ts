import { NextResponse, type NextRequest } from "next/server";
import { decodeSession, isAgencyStaff } from "./lib/session-edge.js";

const PUBLIC = new Set(["/login", "/no-access"]);

/** UX routing only — the NestJS API verifies every token server-side. */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.has(pathname)) return NextResponse.next();
  const token = req.cookies.get("hailing_session")?.value;
  const session = token ? decodeSession(token) : null;
  if (!session) return NextResponse.redirect(new URL("/login", req.url));
  if (!isAgencyStaff(session))
    return NextResponse.redirect(new URL("/no-access", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
