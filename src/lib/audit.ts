import { prisma } from "@/lib/db";
import type { AuditAction } from "@prisma/client";

interface AuditLogParams {
  action: AuditAction;
  actorId?: string;
  actorEmail?: string;
  targetType?: string;
  targetId?: string;
  outcome?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export async function auditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        actorId: params.actorId,
        actorEmail: params.actorEmail,
        targetType: params.targetType,
        targetId: params.targetId,
        outcome: params.outcome ?? "SUCCESS",
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: params.metadata as any,
      },
    });
  } catch (err) {
    // Audit log failures must never crash the application
    console.error("[audit] Failed to write audit log:", err);
  }
}
