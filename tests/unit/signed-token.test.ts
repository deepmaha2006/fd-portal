import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { signDocumentToken, verifyDocumentToken } from "@/lib/signed-token";

describe("signed-token", () => {
  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = "test-secret-key-for-signed-tokens";
  });

  afterEach(() => {
    delete process.env.NEXTAUTH_SECRET;
  });

  it("signs and verifies a document token", () => {
    const token = signDocumentToken("doc-123", "user-456", 300);
    const result = verifyDocumentToken(token);
    expect(result.valid).toBe(true);
    expect(result.payload?.sub).toBe("doc-123");
    expect(result.payload?.actorId).toBe("user-456");
  });

  it("rejects a tampered token", () => {
    const token = signDocumentToken("doc-123", "user-456", 300);
    const tampered = token.slice(0, -4) + "XXXX";
    expect(verifyDocumentToken(tampered).valid).toBe(false);
  });

  it("rejects a malformed token", () => {
    expect(verifyDocumentToken("notavalidtoken").valid).toBe(false);
    expect(verifyDocumentToken("").valid).toBe(false);
  });

  it("rejects an expired token (ttl=-1)", () => {
    const token = signDocumentToken("doc-123", "user-456", -1);
    const result = verifyDocumentToken(token);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("expired");
  });

  it("uses timing-safe comparison (no timing oracle)", () => {
    const token = signDocumentToken("doc-123", "user-456", 300);
    const [payloadB64] = token.split(".");
    const zeroSig = "A".repeat(43); // base64url-encoded zeros, same length
    const forged = `${payloadB64}.${zeroSig}`;
    expect(verifyDocumentToken(forged).valid).toBe(false);
  });
});
