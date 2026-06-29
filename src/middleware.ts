import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";
import {
  getAllowedRolesForPath,
  getDefaultRedirectForRole,
  isPublicRoute,
} from "@/lib/permissions/routes";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.userId || !token.roleCode) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const roleCode = token.roleCode as RoleCode;
  const allowedRoles = getAllowedRolesForPath(pathname);

  if (allowedRoles && !allowedRoles.includes(roleCode)) {
    if (pathname === "/unauthorized") {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  if (pathname === "/" || pathname === "/auth/login") {
    return NextResponse.redirect(new URL(getDefaultRedirectForRole(roleCode), request.url));
  }

  if (roleCode === ROLE_CODES.ADMIN && pathname.startsWith("/directorate")) {
    if (pathname.includes("/new") || pathname.includes("/edit")) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
