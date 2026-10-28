import { describe, it, expect } from "vitest";
import { checkAuthFreshness, ReauthRequiredError } from "@/lib/reauth";

describe("checkAuthFreshness", () => {
  it("returns true when authTime is recent", () => {
    const authTime = Date.now() - 60_000; // 1 minute ago
    expect(checkAuthFreshness(authTime, 300)).toBe(true);
  });

  it("returns false when authTime exceeds maxAgeSeconds", () => {
    const authTime = Date.now() - 400_000; // ~6.7 minutes ago
    expect(checkAuthFreshness(authTime, 300)).toBe(false);
  });

  it("returns false when authTime is undefined", () => {
    expect(checkAuthFreshness(undefined, 300)).toBe(false);
  });

  it("uses default 5-minute window when maxAgeSeconds is omitted", () => {
    const freshAuthTime = Date.now() - 60_000;
    const staleAuthTime = Date.now() - 400_000;
    expect(checkAuthFreshness(freshAuthTime)).toBe(true);
    expect(checkAuthFreshness(staleAuthTime)).toBe(false);
  });
});

describe("ReauthRequiredError", () => {
  it("has statusCode 403 and code REAUTH_REQUIRED", () => {
    const err = new ReauthRequiredError(300);
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("REAUTH_REQUIRED");
    expect(err.message).toContain("300");
  });
});
