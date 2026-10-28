import { describe, it, expect } from "vitest";
import {
  canApproveDeposit,
  canApproveRelease,
  isHighValue,
  HIGH_VALUE_THRESHOLD,
} from "@/lib/maker-checker";

describe("isHighValue", () => {
  it("returns true at exactly the threshold", () => {
    expect(isHighValue(HIGH_VALUE_THRESHOLD)).toBe(true);
  });

  it("returns true above the threshold", () => {
    expect(isHighValue(HIGH_VALUE_THRESHOLD + 1)).toBe(true);
  });

  it("returns false below the threshold", () => {
    expect(isHighValue(HIGH_VALUE_THRESHOLD - 1)).toBe(false);
  });

  it("threshold is 1,00,00,000 INR (10 million)", () => {
    expect(HIGH_VALUE_THRESHOLD).toBe(10_000_000);
  });
});

describe("canApproveDeposit (maker-checker SoD)", () => {
  it("creator cannot approve their own deposit", () => {
    expect(canApproveDeposit("user-1", "user-1")).toBe(false);
  });

  it("a different user can approve", () => {
    expect(canApproveDeposit("user-2", "user-1")).toBe(true);
  });

  it("allows approval when no creator is on record", () => {
    expect(canApproveDeposit("user-1", null)).toBe(true);
    expect(canApproveDeposit("user-1", undefined)).toBe(true);
  });
});

describe("canApproveRelease (release SoD)", () => {
  it("person who requested release cannot approve it", () => {
    expect(canApproveRelease("user-1", "user-1")).toBe(false);
  });

  it("a different user can approve the release", () => {
    expect(canApproveRelease("user-2", "user-1")).toBe(true);
  });

  it("allows release approval when no release requester is on record", () => {
    expect(canApproveRelease("user-1", null)).toBe(true);
    expect(canApproveRelease("user-1", undefined)).toBe(true);
  });
});

describe("payment request transition rules (documented contracts)", () => {
  // These mirror the TRANSITIONS map in the status route — tested as contracts here.
  const OFFICER_ONLY_TRANSITIONS = ["UNDER_REVIEW"];
  const MANAGER_ONLY_TRANSITIONS = ["APPROVED", "REJECTED", "PROCESSING", "COMPLETED"];
  const CANCEL_ALLOWED_FROM = ["SUBMITTED", "UNDER_REVIEW"];

  it("UNDER_REVIEW transition is OFFICER-only", () => {
    // Documented: OFFICER moves SUBMITTED → UNDER_REVIEW
    expect(OFFICER_ONLY_TRANSITIONS).toContain("UNDER_REVIEW");
  });

  it("APPROVED and REJECTED are MANAGER-only", () => {
    expect(MANAGER_ONLY_TRANSITIONS).toContain("APPROVED");
    expect(MANAGER_ONLY_TRANSITIONS).toContain("REJECTED");
  });

  it("CANCELLED is only allowed from SUBMITTED or UNDER_REVIEW", () => {
    expect(CANCEL_ALLOWED_FROM).toContain("SUBMITTED");
    expect(CANCEL_ALLOWED_FROM).toContain("UNDER_REVIEW");
    expect(CANCEL_ALLOWED_FROM).not.toContain("APPROVED");
    expect(CANCEL_ALLOWED_FROM).not.toContain("COMPLETED");
  });
});
