import { describe, it, expect } from "vitest";
import { canManageRole, hasPermission } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

/**
 * Tests the canManageRole gate that sits in front of user:create and user:role_change.
 * These are the rules that prevent privilege escalation.
 */
describe("Privilege escalation prevention", () => {
  describe("ADMIN cannot escalate to SUPER_ADMIN or peer ADMIN", () => {
    it("ADMIN cannot assign SUPER_ADMIN role", () => {
      expect(canManageRole("ADMIN", "SUPER_ADMIN")).toBe(false);
    });

    it("ADMIN cannot assign ADMIN role (peer escalation)", () => {
      expect(canManageRole("ADMIN", "ADMIN")).toBe(false);
    });

    it("ADMIN can assign FINANCE_MANAGER (strictly below)", () => {
      expect(canManageRole("ADMIN", "FINANCE_MANAGER")).toBe(true);
    });
  });

  describe("FINANCE_MANAGER cannot create or modify users above them", () => {
    it("FINANCE_MANAGER cannot assign ADMIN", () => {
      expect(canManageRole("FINANCE_MANAGER", "ADMIN")).toBe(false);
    });

    it("FINANCE_MANAGER cannot assign FINANCE_MANAGER (peer)", () => {
      expect(canManageRole("FINANCE_MANAGER", "FINANCE_MANAGER")).toBe(false);
    });

    it("FINANCE_MANAGER has no user:create permission (API gate)", () => {
      expect(hasPermission("FINANCE_MANAGER", "user:create")).toBe(false);
    });
  });

  describe("FINANCE_OFFICER cannot create any users", () => {
    it("FINANCE_OFFICER has no user:create or user:role_change permission", () => {
      expect(hasPermission("FINANCE_OFFICER", "user:create")).toBe(false);
      expect(hasPermission("FINANCE_OFFICER", "user:role_change")).toBe(false);
    });
  });

  describe("CLIENT and VIEWER cannot create or manage users", () => {
    const noUserCreateRoles: UserRole[] = ["CLIENT", "VIEWER", "AUDITOR"];
    for (const role of noUserCreateRoles) {
      it(`${role} has no user:create permission`, () => {
        expect(hasPermission(role, "user:create")).toBe(false);
      });
    }
  });

  describe("SUPER_ADMIN can manage all roles", () => {
    const allRoles: UserRole[] = [
      "SUPER_ADMIN",
      "ADMIN",
      "FINANCE_MANAGER",
      "FINANCE_OFFICER",
      "AUDITOR",
      "VIEWER",
      "CLIENT",
    ];
    for (const target of allRoles) {
      it(`SUPER_ADMIN can manage ${target}`, () => {
        expect(canManageRole("SUPER_ADMIN", target)).toBe(true);
      });
    }
  });
});
