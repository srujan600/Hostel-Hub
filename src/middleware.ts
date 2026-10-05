import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "hostelhub-super-secure-production-jwt-secret-key-32-chars-min"
);

// Protected route prefixes
const ROLE_ROUTE_PREFIXES: Record<string, string[]> = {
  STUDENT: ["/student"],
  WARDEN: ["/warden"],
  ADMIN: ["/admin"],
  SUPER_ADMIN: ["/admin"],
  SECURITY: ["/security"],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static assets, API health, and internal files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const tokenCookie = req.cookies.get("hostelhub_token")?.value;

  // 1. If accessing /login while already authenticated, redirect to role dashboard
  if (pathname === "/login") {
    if (tokenCookie) {
      try {
        const { payload } = await jwtVerify(tokenCookie, JWT_SECRET);
        const role = (payload as any).role;
        switch (role) {
          case "STUDENT":
            return NextResponse.redirect(new URL("/student/dashboard", req.url));
          case "WARDEN":
            return NextResponse.redirect(new URL("/warden/dashboard", req.url));
          case "ADMIN":
          case "SUPER_ADMIN":
            return NextResponse.redirect(new URL("/admin/dashboard", req.url));
          case "SECURITY":
            return NextResponse.redirect(new URL("/security/dashboard", req.url));
        }
      } catch (err) {
        // Expired or invalid token: allow /login to render
      }
    }
    return NextResponse.next();
  }

  // 2. Check protected route segments
  const isStudentRoute = pathname.startsWith("/student");
  const isWardenRoute = pathname.startsWith("/warden");
  const isAdminRoute = pathname.startsWith("/admin");
  const isSecurityRoute = pathname.startsWith("/security");

  if (isStudentRoute || isWardenRoute || isAdminRoute || isSecurityRoute) {
    if (!tokenCookie) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const { payload } = await jwtVerify(tokenCookie, JWT_SECRET);
      const session = payload as any;

      if (session.status !== "ACTIVE") {
        const inactiveUrl = new URL("/login", req.url);
        inactiveUrl.searchParams.set("error", "account_suspended");
        const res = NextResponse.redirect(inactiveUrl);
        res.cookies.delete("hostelhub_token");
        return res;
      }

      const role = session.role;

      // Role isolation: block cross-role access
      if (isStudentRoute && role !== "STUDENT" && role !== "ADMIN" && role !== "SUPER_ADMIN") {
        return NextResponse.redirect(new URL(getHomeForRole(role), req.url));
      }
      if (isWardenRoute && role !== "WARDEN" && role !== "ADMIN" && role !== "SUPER_ADMIN") {
        return NextResponse.redirect(new URL(getHomeForRole(role), req.url));
      }
      if (isAdminRoute && role !== "ADMIN" && role !== "SUPER_ADMIN") {
        return NextResponse.redirect(new URL(getHomeForRole(role), req.url));
      }
      if (isSecurityRoute && role !== "SECURITY" && role !== "ADMIN" && role !== "SUPER_ADMIN") {
        return NextResponse.redirect(new URL(getHomeForRole(role), req.url));
      }

      return NextResponse.next();
    } catch (err) {
      // Invalid/expired token
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("error", "session_expired");
      loginUrl.searchParams.set("from", pathname);
      const res = NextResponse.redirect(loginUrl);
      res.cookies.delete("hostelhub_token");
      return res;
    }
  }

  return NextResponse.next();
}

function getHomeForRole(role: string): string {
  switch (role) {
    case "STUDENT":
      return "/student/dashboard";
    case "WARDEN":
      return "/warden/dashboard";
    case "ADMIN":
    case "SUPER_ADMIN":
      return "/admin/dashboard";
    case "SECURITY":
      return "/security/dashboard";
    default:
      return "/login";
  }
}

export const config = {
  matcher: [
    "/student/:path*",
    "/warden/:path*",
    "/admin/:path*",
    "/security/:path*",
    "/login",
  ],
};
