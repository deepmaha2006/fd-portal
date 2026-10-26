import { describe, it, expect } from "vitest";
import {
  calculateSimpleInterest,
  calculateMaturityAmount,
  depositDaysHeld,
  isValidTransition,
  getMaturityUrgency,
  sanitizeCsvField,
  generateReferenceNumber,
} from "@/lib/deposit-utils";

// ── Interest calculations ─────────────────────────────────────────────────────

describe("calculateSimpleInterest", () => {
  it("computes P*R*D/36500 correctly", () => {
    // 100000 @ 10% for 365 days = 10000
    expect(calculateSimpleInterest(100000, 10, 365)).toBeCloseTo(10000, 2);
  });

  it("returns 0 for zero principal", () => {
    expect(calculateSimpleInterest(0, 10, 365)).toBe(0);
  });

  it("returns 0 for zero rate", () => {
    expect(calculateSimpleInterest(100000, 0, 365)).toBe(0);
  });

  it("returns 0 for zero days", () => {
    expect(calculateSimpleInterest(100000, 10, 0)).toBe(0);
  });

  it("handles fractional rates", () => {
    // 500000 @ 7.5% for 180 days
    const expected = (500000 * 7.5 * 180) / 36500;
    expect(calculateSimpleInterest(500000, 7.5, 180)).toBeCloseTo(expected, 2);
  });
});

describe("calculateMaturityAmount", () => {
  it("returns principal + interest", () => {
    const interest = calculateSimpleInterest(100000, 10, 365);
    expect(calculateMaturityAmount(100000, 10, 365)).toBeCloseTo(100000 + interest, 2);
  });

  it("returns principal unchanged when rate is 0", () => {
    expect(calculateMaturityAmount(200000, 0, 365)).toBe(200000);
  });
});

// ── Date helpers ──────────────────────────────────────────────────────────────

describe("depositDaysHeld", () => {
  it("calculates exact days between two dates", () => {
    const start = new Date("2024-01-01");
    const end = new Date("2024-01-31");
    expect(depositDaysHeld(start, end)).toBe(30);
  });

  it("returns 0 for same-day dates", () => {
    const d = new Date("2024-06-15");
    expect(depositDaysHeld(d, d)).toBe(0);
  });

  it("handles leap-year February correctly (366 days in 2024)", () => {
    const start = new Date("2024-01-01");
    const end = new Date("2025-01-01");
    expect(depositDaysHeld(start, end)).toBe(366);
  });
});

// ── State machine ─────────────────────────────────────────────────────────────

describe("isValidTransition", () => {
  it("allows DRAFT → PENDING_REVIEW", () => {
    expect(isValidTransition("DRAFT", "PENDING_REVIEW")).toBe(true);
  });

  it("allows PENDING_REVIEW → APPROVED (approval)", () => {
    expect(isValidTransition("PENDING_REVIEW", "APPROVED")).toBe(true);
  });

  it("allows PENDING_REVIEW → DRAFT (rejection back)", () => {
    expect(isValidTransition("PENDING_REVIEW", "DRAFT")).toBe(true);
  });

  it("blocks ACTIVE → DRAFT (backwards skip)", () => {
    expect(isValidTransition("ACTIVE", "DRAFT")).toBe(false);
  });

  it("blocks MATURED → ACTIVE (terminal state)", () => {
    expect(isValidTransition("MATURED", "ACTIVE")).toBe(false);
  });

  it("blocks CANCELLED → anything", () => {
    expect(isValidTransition("CANCELLED", "ACTIVE")).toBe(false);
    expect(isValidTransition("CANCELLED", "DRAFT")).toBe(false);
  });

  it("blocks same-state transition", () => {
    expect(isValidTransition("ACTIVE", "ACTIVE")).toBe(false);
  });
});

// ── Maturity urgency ──────────────────────────────────────────────────────────

describe("getMaturityUrgency", () => {
  const daysFromNow = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d;
  };

  it("returns 'overdue' for past maturity", () => {
    expect(getMaturityUrgency(daysFromNow(-1))).toBe("overdue");
  });

  it("returns 'critical' for 1-7 days", () => {
    expect(getMaturityUrgency(daysFromNow(3))).toBe("critical");
  });

  it("returns 'warning' for 8-15 days", () => {
    expect(getMaturityUrgency(daysFromNow(10))).toBe("warning");
  });

  it("returns 'notice' for 16-30 days", () => {
    expect(getMaturityUrgency(daysFromNow(20))).toBe("notice");
  });

  it("returns 'ok' for > 30 days", () => {
    expect(getMaturityUrgency(daysFromNow(60))).toBe("ok");
  });

  it("returns 'na' for null", () => {
    expect(getMaturityUrgency(null)).toBe("na");
  });
});

// ── CSV injection prevention ──────────────────────────────────────────────────

describe("sanitizeCsvField", () => {
  it("prefixes = with apostrophe to prevent formula injection", () => {
    const result = sanitizeCsvField("=SUM(A1:A10)");
    expect(result).not.toMatch(/^=/);
    expect(result).toContain("'=SUM");
  });

  it("prefixes + prefix", () => {
    const result = sanitizeCsvField("+1234");
    expect(result).not.toMatch(/^\+/);
  });

  it("prefixes - prefix", () => {
    const result = sanitizeCsvField("-1234");
    expect(result).not.toMatch(/^-/);
  });

  it("prefixes @ prefix", () => {
    const result = sanitizeCsvField("@user");
    expect(result).not.toMatch(/^@/);
  });

  it("leaves normal strings unchanged", () => {
    expect(sanitizeCsvField("State Bank of India")).toBe("State Bank of India");
  });

  it("handles empty string", () => {
    expect(sanitizeCsvField("")).toBe("");
  });

  it("handles null/undefined by returning empty string", () => {
    expect(sanitizeCsvField(null as unknown as string)).toBe("");
    expect(sanitizeCsvField(undefined as unknown as string)).toBe("");
  });
});

// ── Reference number generation ───────────────────────────────────────────────

describe("generateReferenceNumber", () => {
  it("formats sequence as 4-digit zero-padded number", () => {
    expect(generateReferenceNumber(1)).toMatch(/FDP-\d{4}-0001/);
    expect(generateReferenceNumber(42)).toMatch(/FDP-\d{4}-0042/);
    expect(generateReferenceNumber(9999)).toMatch(/FDP-\d{4}-9999/);
  });

  it("uses current year by default", () => {
    const year = new Date().getFullYear().toString();
    expect(generateReferenceNumber(1)).toContain(year);
  });

  it("accepts explicit year override", () => {
    expect(generateReferenceNumber(1, 2023)).toContain("2023");
  });
});
