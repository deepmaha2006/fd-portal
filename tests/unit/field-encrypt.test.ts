import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encryptField, decryptField, isEncrypted } from "@/lib/field-encrypt";

const TEST_KEY = "a".repeat(64); // 32 bytes hex

describe("field-encrypt", () => {
  beforeEach(() => {
    process.env.MFA_ENCRYPTION_KEY = TEST_KEY;
    process.env.APP_ENV = "test";
  });

  afterEach(() => {
    delete process.env.MFA_ENCRYPTION_KEY;
    delete process.env.APP_ENV;
  });

  it("encrypts a plaintext value to 'enc:...' format", () => {
    const encrypted = encryptField("1234567890");
    expect(encrypted).toMatch(/^enc:/);
    expect(isEncrypted(encrypted)).toBe(true);
  });

  it("decrypts back to the original plaintext", () => {
    const original = "ACC-9876543210";
    const encrypted = encryptField(original);
    expect(decryptField(encrypted)).toBe(original);
  });

  it("generates a unique ciphertext each time (random IV)", () => {
    const a = encryptField("same-value");
    const b = encryptField("same-value");
    expect(a).not.toBe(b);
    expect(decryptField(a)).toBe("same-value");
    expect(decryptField(b)).toBe("same-value");
  });

  it("returns null for null input", () => {
    expect(decryptField(null)).toBeNull();
    expect(decryptField(undefined)).toBeNull();
  });

  it("round-trips legacy plain values without encryption prefix", () => {
    expect(decryptField("old-unencrypted-value")).toBe("old-unencrypted-value");
  });

  it("handles 'plain:...' prefix from dev/CI mode", () => {
    delete process.env.MFA_ENCRYPTION_KEY;
    const stored = encryptField("dev-account-number");
    expect(stored).toBe("plain:dev-account-number");
    expect(decryptField(stored)).toBe("dev-account-number");
  });

  it("throws if key is wrong length", () => {
    process.env.MFA_ENCRYPTION_KEY = "tooshort";
    expect(() => encryptField("test")).toThrow("32 bytes");
  });

  it("isEncrypted returns false for plain and legacy values", () => {
    expect(isEncrypted("plain:abc")).toBe(false);
    expect(isEncrypted("raw-value")).toBe(false);
    expect(isEncrypted(null)).toBe(false);
  });
});
