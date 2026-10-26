import type { UserRole } from "@prisma/client";
import type { Session } from "next-auth";

// ─── Permission Definitions ───────────────────────────────────────────────────

export const PERMISSIONS = {
  // Deposits
  "deposit:create": ["SUPER_ADMIN", "ADMIN", "FINANCE_MANAGER", "FINANCE_OFFICER"],
  "deposit:read": ["SUPER_ADMIN", "ADMIN", "FINANCE_MANAGER", "FINANCE_OFFICER", "AUDITOR", "VIEWER"],
  "deposit:update": ["SUPER_ADMIN", "ADMIN", "FINANCE_MANAGER", "FINANCE_OFFICER"],
  "deposit:submit": ["SUPER_ADMIN", "ADMIN", "FINANCE_MANAGER", "FINANCE_OFFICER"],
  "deposit:approve": ["SUPER_ADMIN", "ADMIN", "FINANCE_MANAGER"],
  "deposit:reject": ["SUPER_ADMIN", "ADMIN", "FINANCE_MANAGER"],
  "deposit:delete": ["SUPER_ADMIN", "ADMIN"],
  "deposit:archive": ["SUPER_ADMIN", "ADMIN", "FINANCE_MANAGER"],
  "deposit:export": ["SUPER_ADMIN", "ADMIN", "FINANCE_MANAGER", "AUDITOR"],
  // Documents
  "document:upload": ["SUPER_ADMIN", "ADMIN", "FINANCE_MANAGER", "FINANCE_OFFICER"],
  "document:download": ["SUPER_ADMIN", "ADMIN", "FINANCE_MANAGER", "FINANCE_OFFICER", "AUDITOR"],
  "document:delete": ["SUPER_ADMIN", "ADMIN"],
  // Users
  "user:read": ["SUPER_ADMIN", "ADMIN"],
  "user:create": ["SUPER_ADMIN", "ADMIN"],
  "user:update": ["SUPER_ADMIN", "ADMIN"],
  "user:manage": ["SUPER_ADMIN", "ADMIN"],
  "user:deactivate": ["SUPER_ADMIN", "ADMIN"],
  "user:role_change": ["SUPER_ADMIN"],
  // Admin / Settings
  "admin:settings": ["SUPER_ADMIN", "ADMIN"],
  "settings:manage": ["SUPER_ADMIN", "ADMIN"],
  "admin:audit_logs": ["SUPER_ADMIN", "ADMIN", "AUDITOR"],
  "audit:read": ["SUPER_ADMIN", "ADMIN", "AUDITOR"],
  "admin:reminders": ["SUPER_ADMIN", "ADMIN", "FINANCE_MANAGER"],
  // Reports
  "report:generate": ["SUPER_ADMIN", "ADMIN", "FINANCE_MANAGER", "AUDITOR"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

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

export function getUserRole(session: Session | null): UserRole | null {
  return ((session?.user as any)?.role as UserRole) ?? null;
}

export function getUserId(session: Session | null): string | null {
  return ((session?.user as any)?.id as string) ?? null;
}

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
