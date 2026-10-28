/**
 * Re-authentication guard for sensitive actions.
 *
 * Checks that the user's JWT was issued within `maxAgeSeconds` ago.
 * If the token is stale, throws ReauthRequiredError (HTTP 403 with a hint
 * the client should present a password/MFA prompt and call the action again).
 *
 * Usage:
 *   requireRecentAuth(session, 300); // must have authenticated within 5 min
 */

import type { Session } from "next-auth";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

const DEFAULT_MAX_AGE_SECONDS = 300; // 5 minutes

export class ReauthRequiredError extends Error {
  readonly statusCode = 403;
  readonly code = "REAUTH_REQUIRED";
  constructor(maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS) {
    super(
      `This action requires a fresh authentication (within the last ${maxAgeSeconds} seconds). Please log in again and retry.`
    );
    this.name = "ReauthRequiredError";
  }
}

/**
 * Checks `token.authTime` (stamped at sign-in in auth.ts) against now.
 * Throws ReauthRequiredError if the auth is older than maxAgeSeconds.
 *
 * @param req         The incoming NextRequest (needed to read the JWT cookie)
 * @param maxAgeSeconds  How fresh the authentication must be (default 5 min)
 */
export async function requireRecentAuth(
  req: NextRequest,
  maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS
): Promise<void> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    throw new ReauthRequiredError(maxAgeSeconds);
  }

  const authTime = token.authTime as number | undefined;
  if (!authTime) {
    // Tokens issued before authTime was added don't have the field — require re-login
    throw new ReauthRequiredError(maxAgeSeconds);
  }

  const elapsedSeconds = (Date.now() - authTime) / 1000;
  if (elapsedSeconds > maxAgeSeconds) {
    throw new ReauthRequiredError(maxAgeSeconds);
  }
}

/**
 * Sync variant for use when the token is already in hand (e.g., from session callback context).
 * Pass `token.authTime` directly.
 */
export function checkAuthFreshness(
  authTime: number | undefined,
  maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS
): boolean {
  if (!authTime) return false;
  return (Date.now() - authTime) / 1000 <= maxAgeSeconds;
}
