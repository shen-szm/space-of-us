import { NextResponse, type NextRequest } from "next/server";
import { decidePageAccess } from "@/lib/routeAccess";
import { getAuthRole } from "@/lib/server/auth";

export function proxy(request: NextRequest) {
  const role = getAuthRole(request);
  const decision = decidePageAccess(request.nextUrl.pathname, request.nextUrl.search, role);

  if (decision.action === "redirect") {
    return NextResponse.redirect(new URL(decision.destination, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/map/:path*",
    "/couple/:path*",
    "/memories/:path*",
    "/favorites/:path*",
    "/anniversaries/:path*",
    "/time-capsule/:path*",
    "/settings/:path*",
    "/feedback/:path*",
    "/province/:path*",
  ],
};
