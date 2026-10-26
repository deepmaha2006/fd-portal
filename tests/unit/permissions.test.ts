import { describe, it, expect } from "vitest";
import { hasPermission, requirePermission, PERMISSIONS, ForbiddenError } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

describe("hasPermission", () => {
  it("SUPER_ADMIN has all permissions", () => {
    const allPermissions = Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[];
    for (const perm of allPermissions) {
      expect(hasPermission("SUPER_ADMIN", perm)).toBe(true);
    }
  });

  it("VIEWER cannot create deposits", () => {
    expect(hasPermission("VIEWER", "deposit:create")).toBe(false);
  });

  it("VIEWER can read deposits", () => {
    expect(hasPermission("VIEWER", "deposit:read")).toBe(true);
  });

  it("AUDITOR can read and export but not create", () => {
    expect(hasPermission("AUDITOR", "deposit:read")).toBe(true);
    expect(hasPermission("AUDITOR", "deposit:export")).toBe(true);
    expect(hasPermission("AUDITOR", "deposit:create")).toBe(false);
    expect(hasPermission("AUDITOR", "deposit:approve")).toBe(false);
  });

  it("FINANCE_OFFICER can create but not approve", () => {
    expect(hasPermission("FINANCE_OFFICER", "deposit:create")).toBe(true);
    expect(hasPermission("FINANCE_OFFICER", "deposit:approve")).toBe(false);
  });

  it("FINANCE_MANAGER can approve", () => {
    expect(hasPermission("FINANCE_MANAGER", "deposit:approve")).toBe(true);
  });

  it("ADMIN can manage users", () => {
    expect(hasPermission("ADMIN", "user:manage")).toBe(true);
  });

  it("FINANCE_OFFICER cannot manage users", () => {
    expect(hasPermission("FINANCE_OFFICER", "user:manage")).toBe(false);
  });

  it("returns false for unknown role", () => {
    expect(hasPermission("UNKNOWN_ROLE" as UserRole, "deposit:read")).toBe(false);
  });
});

describe("requirePermission", () => {
  it("does not throw when permission is granted", () => {
    expect(() => requirePermission("SUPER_ADMIN", "deposit:delete")).not.toThrow();
  });

  it("throws ForbiddenError when permission is denied", () => {
    expect(() => requirePermission("VIEWER", "deposit:create")).toThrow(ForbiddenError);
  });

  it("ForbiddenError has correct message structure", () => {
    try {
      requirePermission("VIEWER", "deposit:approve");
    } catch (e) {
      expect(e).toBeInstanceOf(ForbiddenError);
      expect((e as ForbiddenError).statusCode).toBe(403);
    }
  });
});
