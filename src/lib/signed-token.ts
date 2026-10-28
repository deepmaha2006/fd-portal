/**
 * Short-lived HMAC-SHA256 signed tokens for document download URLs.
 *
 * Format: "<base64url(payload)>.<base64url(signature)>"
 * Payload: { sub: documentId, iat: epochMs, exp: epochMs }
 *
 * Used to generate one-time-ish download URLs so documents can be embedded
 * in img tags or iframes without exposing a permanent endpoint.
 */

import { createHmac, timingSafeEqual } from "crypto";

const DEFAULT_TTL_SECONDS = 300; // 5 minutes

interface TokenPayload {
  sub: string;     // document ID
  iat: number;     // issued at (ms)
  exp: number;     // expires at (ms)
  actorId: string; // who requested it (for audit)
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function getSigningKey(): Buffer {
  const key = process.env.NEXTAUTH_SECRET;
  if (!key) throw new Error("NEXTAUTH_SECRET is required for signed tokens");
  return Buffer.from(key);
}

export function signDocumentToken(
  documentId: string,
  actorId: string,
  ttlSeconds = DEFAULT_TTL_SECONDS
): string {
  const now = Date.now();
  const payload: TokenPayload = {
    sub: documentId,
    iat: now,
    exp: now + ttlSeconds * 1000,
    actorId,
  };

  const payloadB64 = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = createHmac("sha256", getSigningKey())
    .update(payloadB64)
    .digest();

  return `${payloadB64}.${b64url(sig)}`;
}

export interface VerifyResult {
  valid: boolean;
  payload?: TokenPayload;
  reason?: string;
}

export function verifyDocumentToken(token: string): VerifyResult {
  const parts = token.split(".");
  if (parts.length !== 2) return { valid: false, reason: "malformed" };

  const [payloadB64, sigB64] = parts;

  // Recompute signature
  const expectedSig = createHmac("sha256", getSigningKey())
    .update(payloadB64)
    .digest();

  const receivedSig = Buffer.from(sigB64, "base64url");
  if (
    receivedSig.length !== expectedSig.length ||
    !timingSafeEqual(receivedSig, expectedSig)
  ) {
    return { valid: false, reason: "invalid_signature" };
  }

  let payload: TokenPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return { valid: false, reason: "malformed_payload" };
  }

  if (Date.now() > payload.exp) {
    return { valid: false, reason: "expired" };
  }

  return { valid: true, payload };
}
