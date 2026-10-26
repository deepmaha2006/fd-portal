import { NextResponse } from "next/server";
import { ForbiddenError, UnauthorizedError } from "@/lib/permissions";
import { ZodError } from "zod";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function created<T>(data: T) {
  return ok(data, 201);
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function handleApiError(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json(
      { success: false, error: "Access denied" },
      { status: 403 }
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: "Validation failed",
        details: error.flatten().fieldErrors,
      },
      { status: 422 }
    );
  }
  if (error instanceof Error && error.message === "AccountLocked") {
    return NextResponse.json(
      {
        success: false,
        error:
          "Account is temporarily locked due to too many failed login attempts.",
      },
      { status: 429 }
    );
  }

  // Generic — never expose internals in production
  console.error("[api-error]", error);
  return NextResponse.json(
    { success: false, error: "An internal error occurred" },
    { status: 500 }
  );
}

export function tooManyRequests(resetAt: Date) {
  return NextResponse.json(
    {
      success: false,
      error: "Too many requests. Please try again later.",
      resetAt: resetAt.toISOString(),
    },
    {
      status: 429,
      headers: { "Retry-After": String(Math.ceil((resetAt.getTime() - Date.now()) / 1000)) },
    }
  );
}
