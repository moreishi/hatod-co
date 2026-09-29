import { NextResponse, type NextRequest } from "next/server";
import { decodeSession, isAdmin } from "./lib/session-edge.js";

const PUBLIC = new Set(["/login", "/no-access"]);

/**
 * UX routing only (edge-safe: no signature check here).
 * The NestJS API verifies every token server-side (spec rule 49).
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.has(pathname) || pathname.startsWith("/invite/"))
    return NextResponse.next();
  const token = req.cookies.get("hailing_session")?.value;
  const session = token ? decodeSession(token) : null;
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname === "/" || pathname === "/me") return NextResponse.next();
  if (!isAdmin(session)) {
    return NextResponse.redirect(new URL("/no-access", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
