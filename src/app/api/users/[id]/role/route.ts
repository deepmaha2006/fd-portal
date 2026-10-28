export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import {
  requirePermission,
  getUserId,
  getUserRole,
  canManageRole,
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/permissions";
import { ok, handleApiError } from "@/lib/api-response";
import type { UserRole } from "@prisma/client";

const ChangeRoleSchema = z.object({
  role: z.enum([
    "ADMIN",
    "FINANCE_MANAGER",
    "FINANCE_OFFICER",
    "AUDITOR",
    "VIEWER",
    "CLIENT",
  ]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();
    requirePermission(session, "user:role_change");

    const actorId = getUserId(session)!;
    const actorRole = getUserRole(session)!;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    // Block self-modification
    if (params.id === actorId) {
      throw new ForbiddenError("You cannot change your own role");
    }

    const body = await req.json();
    const { role: newRole } = ChangeRoleSchema.parse(body);

    const target = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, role: true, email: true },
    });
    if (!target) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Actor must outrank both current and new role
    if (!canManageRole(actorRole, target.role as UserRole)) {
      await auditLog({
        action: "PERMISSION_DENIED",
        actorId,
        outcome: "FAILURE",
        ipAddress: ip,
        metadata: {
          reason: "cannot_manage_current_role",
          actorRole,
          targetRole: target.role,
        },
      });
      throw new ForbiddenError("You cannot manage this user's current role");
    }
    if (!canManageRole(actorRole, newRole as UserRole)) {
      await auditLog({
        action: "PERMISSION_DENIED",
        actorId,
        outcome: "FAILURE",
        ipAddress: ip,
        metadata: {
          reason: "privilege_escalation_attempt",
          actorRole,
          targetRole: newRole,
        },
      });
      throw new ForbiddenError(
        `You cannot assign role ${newRole}: insufficient privilege`
      );
    }

    // Prevent removing the last SUPER_ADMIN from their role
    // (newRole can never be SUPER_ADMIN via this endpoint — use DB seeding for that)
    if (target.role === "SUPER_ADMIN") {
      const superAdminCount = await prisma.user.count({
        where: { role: "SUPER_ADMIN", status: "ACTIVE" },
      });
      if (superAdminCount <= 1) {
        throw new ForbiddenError("Cannot change the role of the last active SUPER_ADMIN");
      }
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: {
        role: newRole as UserRole,
        // Bump tokenVersion to revoke existing sessions for this user
        tokenVersion: { increment: 1 },
      },
      select: { id: true, email: true, role: true },
    });

    await auditLog({
      action: "USER_ROLE_CHANGED",
      actorId,
      targetType: "User",
      targetId: params.id,
      ipAddress: ip,
      metadata: { email: target.email, fromRole: target.role, toRole: newRole },
    });

    return ok(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
