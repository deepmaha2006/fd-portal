import { NextRequest } from "next/server";
import { env } from "@/lib/env";

/**
 * CSRF check via Origin header for all state-changing API routes.
 * Reject if Origin is present but does not match ALLOWED_ORIGINS.
 * Requests with no Origin header (e.g. same-site form POSTs, server-side calls)
 * are allowed — browsers always set Origin on cross-origin requests.
 */
export function checkCsrf(req: NextRequest): { ok: true } | { ok: false; reason: string } {
  const origin = req.headers.get("origin");
  if (!origin) return { ok: true }; // no origin header → same-site or non-browser

  const allowed = env.ALLOWED_ORIGINS;
  if (allowed.some((o) => o === origin)) return { ok: true };

  return { ok: false, reason: `Origin ${origin} not in allowed list` };
}

/**
 * Extract the real client IP from a trusted proxy header.
 * Only reads X-Forwarded-For when TRUSTED_PROXY env var is set;
 * falls back to a safe "unknown" string to avoid IP spoofing.
 */
export function getClientIp(req: NextRequest): string {
  const trustedProxy = process.env.TRUSTED_PROXY;
  if (trustedProxy) {
    const xff = req.headers.get("x-forwarded-for");
    if (xff) {
      // First IP in the chain is the original client when behind a trusted proxy
      return xff.split(",")[0].trim();
    }
  }
  return "unknown";
}
