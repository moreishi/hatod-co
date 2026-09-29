import { auth } from "@/auth.config";
import { isPublicPath, isStaff, ROLES, type Role } from "@/lib/access";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (!req.auth && !isPublicPath(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return Response.redirect(url);
  }
  // API routes enforce their own session + scope checks — the proxy only
  // routes page navigations. (Unauthenticated API callers get 401 JSON
  // from the handler, never a login redirect.)
  if (pathname.startsWith("/api/")) return;
  // Signed-in routing by profile. Staff roam everywhere; agency and driver
  // identities stay inside their own portals.
  const u = req.auth?.user as { role?: string; roles?: string[] } | undefined;
  const roles = ((u?.roles ?? (u?.role ? [u.role] : [])) as string[]).filter((r) =>
    ROLES.includes(r as Role),
  ) as Role[];
  const inPortal = (base: string) => pathname === base || pathname.startsWith(`${base}/`);
  if (req.auth && roles.some((r) => isStaff(r))) return;
  if (
    req.auth &&
    roles.includes("agency") &&
    (inPortal("/fleet") || inPortal("/agencies/me") || pathname === "/no-access")
  )
    return;
  if (
    req.auth &&
    !roles.includes("agency") &&
    roles.includes("driver") &&
    (inPortal("/drivers/me") || pathname === "/no-access")
  )
    return;
  if (
    req.auth &&
    !roles.includes("agency") &&
    !roles.includes("driver") &&
    roles.includes("rider") &&
    (inPortal("/riders/me") || pathname === "/no-access")
  )
    return;
  if (req.auth && pathname !== "/no-access") {
    const url = req.nextUrl.clone();
    url.pathname = roles.includes("agency")
      ? "/fleet"
      : roles.includes("driver")
        ? "/drivers/me"
        : roles.includes("rider")
          ? "/riders/me"
          : "/no-access";
    return Response.redirect(url);
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
