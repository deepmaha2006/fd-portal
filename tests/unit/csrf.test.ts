import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock env before importing csrf
vi.mock("@/lib/env", () => ({
  env: {
    ALLOWED_ORIGINS: ["http://localhost:3000", "https://fd-portal-kohl.vercel.app"],
  },
}));

// Import after mocking
const { checkCsrf } = await import("@/lib/csrf");

function makeRequest(origin: string | null): any {
  return {
    headers: {
      get: (key: string) => (key === "origin" ? origin : null),
    },
  };
}

describe("checkCsrf", () => {
  it("allows requests with no Origin header (same-site / server-side)", () => {
    expect(checkCsrf(makeRequest(null))).toEqual({ ok: true });
  });

  it("allows requests from an allowed origin", () => {
    expect(checkCsrf(makeRequest("http://localhost:3000"))).toEqual({ ok: true });
    expect(checkCsrf(makeRequest("https://fd-portal-kohl.vercel.app"))).toEqual({ ok: true });
  });

  it("rejects requests from a disallowed origin", () => {
    const result = checkCsrf(makeRequest("https://evil.example.com"));
    expect(result.ok).toBe(false);
  });

  it("rejects requests from a partial-match origin (no prefix matching)", () => {
    const result = checkCsrf(makeRequest("http://localhost:3000.evil.com"));
    expect(result.ok).toBe(false);
  });

  it("includes the offending origin in the reason on rejection", () => {
    const result = checkCsrf(makeRequest("https://attacker.com")) as { ok: false; reason: string };
    expect(result.reason).toContain("attacker.com");
  });
});
