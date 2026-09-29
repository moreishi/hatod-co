import { NextResponse, type NextRequest } from "next/server";
import { decodeSession } from "./lib/session-edge.js";

const PUBLIC = new Set(["/login"]);

/** Any signed-in user may ride. The API enforces participant rules. */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.has(pathname)) return NextResponse.next();
  const token = req.cookies.get("hailing_session")?.value;
  if (!token || !decodeSession(token)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
