export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
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

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();
    requirePermission(session, "user:deactivate");

    const actorId = getUserId(session)!;
    const actorRole = getUserRole(session)!;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    // Block self-deactivation
    if (params.id === actorId) {
      throw new ForbiddenError("You cannot deactivate your own account");
    }

    const target = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, role: true, status: true, email: true },
    });
    if (!target) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    if (!canManageRole(actorRole, target.role as UserRole)) {
      await auditLog({
        action: "PERMISSION_DENIED",
        actorId,
        outcome: "FAILURE",
        ipAddress: ip,
        metadata: {
          reason: "cannot_deactivate_higher_role",
          actorRole,
          targetRole: target.role,
        },
      });
      throw new ForbiddenError("You cannot deactivate a user with a higher or equal role");
    }

    // Prevent deactivating the last SUPER_ADMIN
    if (target.role === "SUPER_ADMIN") {
      const activeCount = await prisma.user.count({
        where: { role: "SUPER_ADMIN", status: "ACTIVE" },
      });
      if (activeCount <= 1) {
        throw new ForbiddenError("Cannot deactivate the last active SUPER_ADMIN");
      }
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: {
        status: "INACTIVE",
        // Revoke all existing sessions immediately
        tokenVersion: { increment: 1 },
      },
      select: { id: true, email: true, status: true },
    });

    await auditLog({
      action: "USER_DEACTIVATED",
      actorId,
      targetType: "User",
      targetId: params.id,
      ipAddress: ip,
      metadata: { email: target.email, role: target.role },
    });

    return ok(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
