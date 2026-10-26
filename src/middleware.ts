import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Token is guaranteed present here (withAuth checked it)
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token }) {
        // Any authenticated user with a valid token may proceed;
        // per-route permission checks happen in route handlers/pages.
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/deposits/:path*",
    "/reports/:path*",
    "/users/:path*",
    "/settings/:path*",
    "/audit-logs/:path*",
    "/api/deposits/:path*",
    "/api/dashboard/:path*",
    "/api/users/:path*",
    "/api/audit-logs/:path*",
    "/api/documents/:path*",
  ],
};
