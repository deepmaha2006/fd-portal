/**
 * AES-256-GCM field-level encryption for sensitive values (account numbers, PAN).
 *
 * Format stored in DB:  "enc:<base64(iv)>:<base64(authTag)>:<base64(ciphertext)>"
 * When MFA_ENCRYPTION_KEY is not set, values are stored unencrypted with a
 * "plain:" prefix so they round-trip correctly and decryption is a no-op.
 * This prevents data loss in dev/CI while making encryption mandatory in production.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function getKey(): Buffer | null {
  const raw = process.env.MFA_ENCRYPTION_KEY;
  if (!raw) return null;
  const buf = Buffer.from(raw, "hex");
  if (buf.length !== 32) {
    throw new Error(
      "MFA_ENCRYPTION_KEY must be a 64-character hex string (32 bytes for AES-256)"
    );
  }
  return buf;
}

/**
 * Encrypt a plaintext value. Returns an "enc:..." string suitable for DB storage.
 * Falls back to "plain:..." when no key is configured (dev/CI only).
 */
export function encryptField(plaintext: string): string {
  const key = getKey();
  if (!key) {
    if (process.env.APP_ENV === "production") {
      throw new Error(
        "MFA_ENCRYPTION_KEY must be set in production. Cannot store sensitive fields unencrypted."
      );
    }
    return "plain:" + plaintext;
  }

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    "enc",
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

/**
 * Decrypt an "enc:..." or "plain:..." string from the DB.
 * Returns null if the input is null/undefined.
 */
export function decryptField(stored: string | null | undefined): string | null {
  if (stored == null) return null;

  if (stored.startsWith("plain:")) {
    return stored.slice(6);
  }

  if (!stored.startsWith("enc:")) {
    // Legacy unencrypted value (before encryption was added) — return as-is
    return stored;
  }

  const key = getKey();
  if (!key) {
    throw new Error(
      "MFA_ENCRYPTION_KEY is required to decrypt stored field values"
    );
  }

  const parts = stored.split(":");
  if (parts.length !== 4) {
    throw new Error("Malformed encrypted field value");
  }

  const iv = Buffer.from(parts[1], "base64");
  const authTag = Buffer.from(parts[2], "base64");
  const ciphertext = Buffer.from(parts[3], "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

/** True if a stored value has been encrypted (vs. legacy plain or plain: prefix). */
export function isEncrypted(stored: string | null | undefined): boolean {
  return typeof stored === "string" && stored.startsWith("enc:");
}
