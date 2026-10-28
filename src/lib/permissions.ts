import type { UserRole } from "@prisma/client";
import type { Session } from "next-auth";

// ─── Role Hierarchy (higher index = more privilege) ───────────────────────────

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  CLIENT: 0,
  VIEWER: 1,
  AUDITOR: 2,
  FINANCE_OFFICER: 3,
  FINANCE_MANAGER: 4,
  ADMIN: 5,
  SUPER_ADMIN: 6,
};

// ─── Permission Definitions ───────────────────────────────────────────────────

export const PERMISSIONS = {
  // Deposits — FINANCE_OFFICER creates; FINANCE_MANAGER approves; SUPER_ADMIN final-approves high-value
  "deposit:create": ["FINANCE_OFFICER"],
  "deposit:read": ["SUPER_ADMIN", "ADMIN", "FINANCE_MANAGER", "FINANCE_OFFICER", "AUDITOR", "VIEWER"],
  "deposit:update_own": ["FINANCE_OFFICER"],
  "deposit:update": ["SUPER_ADMIN", "ADMIN", "FINANCE_MANAGER", "FINANCE_OFFICER"],
  "deposit:submit": ["FINANCE_OFFICER"],
  "deposit:approve": ["FINANCE_MANAGER"],
  "deposit:reject": ["FINANCE_MANAGER"],
  "deposit:archive": ["FINANCE_MANAGER"],
  "deposit:export": ["SUPER_ADMIN", "ADMIN", "FINANCE_MANAGER", "AUDITOR"],
  "deposit:release_request": ["FINANCE_OFFICER"],
  "deposit:release_approve": ["FINANCE_MANAGER"],
  "deposit:high_value_approve": ["SUPER_ADMIN"],
  // Documents
  "document:upload": ["FINANCE_OFFICER", "FINANCE_MANAGER"],
  "document:download": ["SUPER_ADMIN", "ADMIN", "FINANCE_MANAGER", "FINANCE_OFFICER", "AUDITOR"],
  "document:delete": ["SUPER_ADMIN", "ADMIN"],
  // Users
  "user:read": ["SUPER_ADMIN", "ADMIN"],
  "user:create": ["SUPER_ADMIN", "ADMIN"],
  "user:update": ["SUPER_ADMIN", "ADMIN"],
  "user:manage": ["SUPER_ADMIN", "ADMIN"],
  "user:deactivate": ["SUPER_ADMIN", "ADMIN"],
  "user:role_change": ["SUPER_ADMIN", "ADMIN"],
  // Admin / Settings
  "admin:settings": ["SUPER_ADMIN"],
  "settings:manage": ["SUPER_ADMIN", "ADMIN"],
  "admin:audit_logs": ["SUPER_ADMIN", "ADMIN", "AUDITOR"],
  "audit:read": ["SUPER_ADMIN", "ADMIN", "AUDITOR"],
  "admin:reminders": ["FINANCE_MANAGER"],
  // Reports
  "report:generate": ["FINANCE_MANAGER"],
  // KYC
  "kyc:review": ["SUPER_ADMIN", "ADMIN"],
  // Payment requests
  "payment_request:create": ["CLIENT"],
  "payment_request:cancel_own": ["CLIENT"],
  "payment_request:read_own": ["CLIENT"],
  "payment_request:review": ["FINANCE_OFFICER"],
  "payment_request:approve": ["FINANCE_MANAGER"],
  "payment_request:reject": ["FINANCE_MANAGER"],
  // MFA management
  "mfa:reset": ["SUPER_ADMIN", "ADMIN"],
  // User unlock
  "user:unlock": ["SUPER_ADMIN"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

// ─── Core Checks ─────────────────────────────────────────────────────────────

export function hasPermission(
  userRole: UserRole | undefined | null,
  permission: Permission
): boolean {
  if (!userRole) return false;
  return (PERMISSIONS[permission] as readonly string[]).includes(userRole);
}

export function requirePermission(
  sessionOrRole: Session | UserRole | null | undefined,
  permission: Permission
): void {
  let role: UserRole | undefined;
  if (typeof sessionOrRole === "string") {
    role = sessionOrRole as UserRole;
  } else {
    role = ((sessionOrRole as Session | null)?.user as any)?.role as UserRole | undefined;
  }
  if (!hasPermission(role, permission)) {
    throw new ForbiddenError(`Permission denied: ${permission}`);
  }
}

// ─── Role Management ──────────────────────────────────────────────────────────

/**
 * Returns true if `actor` may create or edit a user with `target` role.
 * Rule: actor must have strictly higher hierarchy level than target.
 * Exception: SUPER_ADMIN may manage ADMIN (equal level would normally fail).
 */
export function canManageRole(
  actorRole: UserRole,
  targetRole: UserRole
): boolean {
  const actorLevel = ROLE_HIERARCHY[actorRole];
  const targetLevel = ROLE_HIERARCHY[targetRole];

  if (actorRole === "SUPER_ADMIN") return true;
  return actorLevel > targetLevel;
}

// ─── Session Helpers ──────────────────────────────────────────────────────────

export function getUserRole(session: Session | null): UserRole | null {
  return ((session?.user as any)?.role as UserRole) ?? null;
}

export function getUserId(session: Session | null): string | null {
  return ((session?.user as any)?.id as string) ?? null;
}

// ─── Errors ───────────────────────────────────────────────────────────────────

export class ForbiddenError extends Error {
  readonly statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}
