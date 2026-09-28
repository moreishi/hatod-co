import { auth } from "@/auth";
import { isPublicPath } from "@/lib/access";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (!req.auth && !isPublicPath(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return Response.redirect(url);
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
