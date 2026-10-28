import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;
    const role = token?.role as UserRole | undefined;

    // CLIENT users trying to access admin dashboard → redirect to portal
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/deposits") ||
        pathname.startsWith("/reports") || pathname.startsWith("/users") ||
        pathname.startsWith("/settings") || pathname.startsWith("/audit-logs") ||
        pathname.startsWith("/admin")) {
      if (role === "CLIENT") {
        return NextResponse.redirect(new URL("/portal", req.url));
      }
    }

    // Non-CLIENT users trying to access portal → redirect to dashboard
    if (pathname.startsWith("/portal")) {
      if (role && role !== "CLIENT") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token, req }) {
        const pathname = req.nextUrl.pathname;
        // Public routes — no token required
        if (
          pathname === "/" ||
          pathname.startsWith("/login") ||
          pathname.startsWith("/register") ||
          pathname.startsWith("/api/register") ||
          pathname.startsWith("/_next") ||
          pathname.startsWith("/favicon")
        ) {
          return true;
        }
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
