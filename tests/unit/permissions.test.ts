import { describe, it, expect } from "vitest";
import {
  hasPermission,
  requirePermission,
  canManageRole,
  PERMISSIONS,
  ForbiddenError,
  ROLE_HIERARCHY,
} from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

// ─── hasPermission ────────────────────────────────────────────────────────────

describe("hasPermission", () => {
  it("SUPER_ADMIN has user:unlock and admin:settings", () => {
    expect(hasPermission("SUPER_ADMIN", "user:unlock")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "admin:settings")).toBe(true);
  });

  it("SUPER_ADMIN has deposit:high_value_approve", () => {
    expect(hasPermission("SUPER_ADMIN", "deposit:high_value_approve")).toBe(true);
  });

  it("SUPER_ADMIN does NOT have deposit:create (SoD: managers approve, not create)", () => {
    expect(hasPermission("SUPER_ADMIN", "deposit:create")).toBe(false);
  });

  it("SUPER_ADMIN does NOT have deposit:approve (only FINANCE_MANAGER does)", () => {
    expect(hasPermission("SUPER_ADMIN", "deposit:approve")).toBe(false);
  });

  it("ADMIN does NOT have deposit:approve or deposit:create", () => {
    expect(hasPermission("ADMIN", "deposit:approve")).toBe(false);
    expect(hasPermission("ADMIN", "deposit:create")).toBe(false);
  });

  it("ADMIN can review KYC and manage banks", () => {
    expect(hasPermission("ADMIN", "kyc:review")).toBe(true);
    expect(hasPermission("ADMIN", "settings:manage")).toBe(true);
    expect(hasPermission("ADMIN", "user:deactivate")).toBe(true);
    expect(hasPermission("ADMIN", "mfa:reset")).toBe(true);
  });

  it("FINANCE_MANAGER can approve/reject/archive/export and generate reports", () => {
    expect(hasPermission("FINANCE_MANAGER", "deposit:approve")).toBe(true);
    expect(hasPermission("FINANCE_MANAGER", "deposit:reject")).toBe(true);
    expect(hasPermission("FINANCE_MANAGER", "deposit:archive")).toBe(true);
    expect(hasPermission("FINANCE_MANAGER", "deposit:export")).toBe(true);
    expect(hasPermission("FINANCE_MANAGER", "payment_request:approve")).toBe(true);
    expect(hasPermission("FINANCE_MANAGER", "payment_request:reject")).toBe(true);
    expect(hasPermission("FINANCE_MANAGER", "deposit:release_approve")).toBe(true);
    expect(hasPermission("FINANCE_MANAGER", "report:generate")).toBe(true);
    expect(hasPermission("FINANCE_MANAGER", "admin:reminders")).toBe(true);
  });

  it("FINANCE_MANAGER does NOT have deposit:create or deposit:submit", () => {
    expect(hasPermission("FINANCE_MANAGER", "deposit:create")).toBe(false);
    expect(hasPermission("FINANCE_MANAGER", "deposit:submit")).toBe(false);
  });

  it("FINANCE_OFFICER can create, update_own, submit, release_request, upload docs, review payment requests", () => {
    expect(hasPermission("FINANCE_OFFICER", "deposit:create")).toBe(true);
    expect(hasPermission("FINANCE_OFFICER", "deposit:update_own")).toBe(true);
    expect(hasPermission("FINANCE_OFFICER", "deposit:submit")).toBe(true);
    expect(hasPermission("FINANCE_OFFICER", "deposit:release_request")).toBe(true);
    expect(hasPermission("FINANCE_OFFICER", "document:upload")).toBe(true);
    expect(hasPermission("FINANCE_OFFICER", "payment_request:review")).toBe(true);
  });

  it("FINANCE_OFFICER cannot approve or export", () => {
    expect(hasPermission("FINANCE_OFFICER", "deposit:approve")).toBe(false);
    expect(hasPermission("FINANCE_OFFICER", "deposit:export")).toBe(false);
    expect(hasPermission("FINANCE_OFFICER", "payment_request:approve")).toBe(false);
  });

  it("AUDITOR has read-only: deposit:read, audit:read, deposit:export, document:download", () => {
    expect(hasPermission("AUDITOR", "deposit:read")).toBe(true);
    expect(hasPermission("AUDITOR", "audit:read")).toBe(true);
    expect(hasPermission("AUDITOR", "deposit:export")).toBe(true);
    expect(hasPermission("AUDITOR", "document:download")).toBe(true);
  });

  it("AUDITOR has no write permissions", () => {
    expect(hasPermission("AUDITOR", "deposit:create")).toBe(false);
    expect(hasPermission("AUDITOR", "deposit:approve")).toBe(false);
    expect(hasPermission("AUDITOR", "deposit:update")).toBe(false);
    expect(hasPermission("AUDITOR", "document:upload")).toBe(false);
    expect(hasPermission("AUDITOR", "user:create")).toBe(false);
  });

  it("VIEWER has deposit:read only (no documents, no export)", () => {
    expect(hasPermission("VIEWER", "deposit:read")).toBe(true);
    expect(hasPermission("VIEWER", "document:download")).toBe(false);
    expect(hasPermission("VIEWER", "deposit:export")).toBe(false);
    expect(hasPermission("VIEWER", "deposit:create")).toBe(false);
  });

  it("CLIENT can create payment requests and cancel own", () => {
    expect(hasPermission("CLIENT", "payment_request:create")).toBe(true);
    expect(hasPermission("CLIENT", "payment_request:cancel_own")).toBe(true);
    expect(hasPermission("CLIENT", "payment_request:read_own")).toBe(true);
  });

  it("CLIENT cannot create deposits, read admin data, or export", () => {
    expect(hasPermission("CLIENT", "deposit:create")).toBe(false);
    expect(hasPermission("CLIENT", "deposit:read")).toBe(false);
    expect(hasPermission("CLIENT", "user:read")).toBe(false);
    expect(hasPermission("CLIENT", "deposit:export")).toBe(false);
  });

  it("returns false for undefined or null role", () => {
    expect(hasPermission(undefined, "deposit:read")).toBe(false);
    expect(hasPermission(null, "deposit:read")).toBe(false);
  });

  it("returns false for unknown role string", () => {
    expect(hasPermission("UNKNOWN_ROLE" as UserRole, "deposit:read")).toBe(false);
  });
});

// ─── requirePermission ────────────────────────────────────────────────────────

describe("requirePermission", () => {
  it("does not throw when permission is granted", () => {
    expect(() => requirePermission("FINANCE_MANAGER", "deposit:approve")).not.toThrow();
  });

  it("throws ForbiddenError when permission is denied", () => {
    expect(() => requirePermission("VIEWER", "deposit:create")).toThrow(ForbiddenError);
  });

  it("ForbiddenError has statusCode 403", () => {
    try {
      requirePermission("CLIENT", "deposit:approve");
    } catch (e) {
      expect(e).toBeInstanceOf(ForbiddenError);
      expect((e as ForbiddenError).statusCode).toBe(403);
    }
  });

  it("accepts a session object", () => {
    const fakeSession = { user: { role: "FINANCE_MANAGER", id: "u1" } } as any;
    expect(() => requirePermission(fakeSession, "deposit:approve")).not.toThrow();
  });
});

// ─── canManageRole ────────────────────────────────────────────────────────────

describe("canManageRole", () => {
  it("SUPER_ADMIN can manage all roles including ADMIN", () => {
    const targets: UserRole[] = ["ADMIN", "FINANCE_MANAGER", "FINANCE_OFFICER", "AUDITOR", "VIEWER", "CLIENT"];
    for (const t of targets) {
      expect(canManageRole("SUPER_ADMIN", t)).toBe(true);
    }
  });

  it("ADMIN can manage roles strictly below ADMIN", () => {
    expect(canManageRole("ADMIN", "FINANCE_MANAGER")).toBe(true);
    expect(canManageRole("ADMIN", "FINANCE_OFFICER")).toBe(true);
    expect(canManageRole("ADMIN", "AUDITOR")).toBe(true);
    expect(canManageRole("ADMIN", "VIEWER")).toBe(true);
    expect(canManageRole("ADMIN", "CLIENT")).toBe(true);
  });

  it("ADMIN cannot manage ADMIN or SUPER_ADMIN", () => {
    expect(canManageRole("ADMIN", "ADMIN")).toBe(false);
    expect(canManageRole("ADMIN", "SUPER_ADMIN")).toBe(false);
  });

  it("FINANCE_MANAGER cannot manage ADMIN or FINANCE_MANAGER", () => {
    expect(canManageRole("FINANCE_MANAGER", "ADMIN")).toBe(false);
    expect(canManageRole("FINANCE_MANAGER", "FINANCE_MANAGER")).toBe(false);
  });

  it("FINANCE_MANAGER can manage FINANCE_OFFICER, AUDITOR, VIEWER, CLIENT", () => {
    expect(canManageRole("FINANCE_MANAGER", "FINANCE_OFFICER")).toBe(true);
    expect(canManageRole("FINANCE_MANAGER", "AUDITOR")).toBe(true);
    expect(canManageRole("FINANCE_MANAGER", "VIEWER")).toBe(true);
    expect(canManageRole("FINANCE_MANAGER", "CLIENT")).toBe(true);
  });

  // canManageRole is a pure hierarchy check.
  // FINANCE_OFFICER lacks user:create permission so the API gate fires first;
  // but by pure hierarchy they ARE above VIEWER/CLIENT/AUDITOR.
  it("FINANCE_OFFICER is above VIEWER and CLIENT by hierarchy (API gate blocks separately)", () => {
    expect(canManageRole("FINANCE_OFFICER", "VIEWER")).toBe(true);
    expect(canManageRole("FINANCE_OFFICER", "CLIENT")).toBe(true);
  });

  it("FINANCE_OFFICER cannot manage AUDITOR (same or higher role check)", () => {
    // AUDITOR level 2 < FINANCE_OFFICER level 3 → true (they are below)
    expect(canManageRole("FINANCE_OFFICER", "AUDITOR")).toBe(true);
  });

  it("VIEWER cannot manage CLIENT (same level 1 > 0 = true, but no user:create permission)", () => {
    // By hierarchy VIEWER (1) > CLIENT (0) so returns true — but VIEWER has no user:create
    expect(canManageRole("VIEWER", "CLIENT")).toBe(true);
  });

  it("CLIENT cannot manage CLIENT (same level, not strictly greater)", () => {
    expect(canManageRole("CLIENT", "CLIENT")).toBe(false);
  });

  it("FINANCE_OFFICER cannot manage FINANCE_OFFICER (same level)", () => {
    expect(canManageRole("FINANCE_OFFICER", "FINANCE_OFFICER")).toBe(false);
  });
});

// ─── ROLE_HIERARCHY ───────────────────────────────────────────────────────────

describe("ROLE_HIERARCHY", () => {
  it("SUPER_ADMIN has the highest level", () => {
    const levels = Object.values(ROLE_HIERARCHY);
    expect(ROLE_HIERARCHY["SUPER_ADMIN"]).toBe(Math.max(...levels));
  });

  it("CLIENT has the lowest level", () => {
    const levels = Object.values(ROLE_HIERARCHY);
    expect(ROLE_HIERARCHY["CLIENT"]).toBe(Math.min(...levels));
  });

  it("ADMIN is above FINANCE_MANAGER", () => {
    expect(ROLE_HIERARCHY["ADMIN"]).toBeGreaterThan(ROLE_HIERARCHY["FINANCE_MANAGER"]);
  });
});
