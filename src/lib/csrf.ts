import { NextRequest } from "next/server";
import { env } from "@/lib/env";

/**
 * CSRF check via Origin/Host comparison for state-changing API routes.
 *
 * Strategy (in priority order):
 *  1. No Origin header → allow (same-site form POST or server-side call)
 *  2. Origin host === request Host header → allow (same-origin fetch, works on
 *     any Vercel URL without needing env vars configured)
 *  3. Origin matches ALLOWED_ORIGINS env var → allow (explicit extra origins)
 *  4. Otherwise → reject
 */
export function checkCsrf(req: NextRequest): { ok: true } | { ok: false; reason: string } {
  const origin = req.headers.get("origin");
  if (!origin) return { ok: true };

  // Same-host check: works automatically on every Vercel deployment URL
  const requestHost = req.headers.get("host");
  if (requestHost) {
    try {
      if (new URL(origin).host === requestHost) return { ok: true };
    } catch {
      // malformed origin — fall through to allowlist
    }
  }

  const allowed = env.ALLOWED_ORIGINS;
  if (allowed.some((o) => o === origin)) return { ok: true };

  return { ok: false, reason: `Origin ${origin} not allowed` };
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
