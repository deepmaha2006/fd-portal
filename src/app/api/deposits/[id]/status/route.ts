export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { requirePermission, getUserId, UnauthorizedError, ForbiddenError } from "@/lib/permissions";
import { ok, handleApiError } from "@/lib/api-response";
import { isValidTransition } from "@/lib/deposit-utils";
import { canApproveDeposit, canApproveRelease, isHighValue } from "@/lib/maker-checker";
import type { DepositStatus, AuditAction } from "@prisma/client";

const StatusChangeSchema = z.object({
  status: z.enum([
    "DRAFT",
    "PENDING_REVIEW",
    "APPROVED",
    "ACTIVE",
    "MATURING_SOON",
    "MATURED",
    "RENEWAL_PENDING",
    "RENEWED",
    "RELEASE_PENDING",
    "RELEASED",
    "CANCELLED",
    "ARCHIVED",
  ]),
  notes: z.string().max(2000).optional(),
});

// Map status → permission requirement
const STATUS_PERMISSIONS: Partial<Record<DepositStatus, Parameters<typeof requirePermission>[1]>> = {
  PENDING_REVIEW: "deposit:submit",
  APPROVED: "deposit:approve",
  CANCELLED: "deposit:update",
  RELEASE_PENDING: "deposit:update",
  RELEASED: "deposit:approve",
  ARCHIVED: "deposit:archive",
};

// Map status → audit action
const STATUS_AUDIT_ACTIONS: Partial<Record<DepositStatus, AuditAction>> = {
  PENDING_REVIEW: "DEPOSIT_SUBMITTED",
  APPROVED: "DEPOSIT_APPROVED",
  CANCELLED: "DEPOSIT_CANCELLED",
  RELEASE_PENDING: "DEPOSIT_STATUS_CHANGED",
  RELEASED: "DEPOSIT_RELEASED",
  ARCHIVED: "DEPOSIT_ARCHIVED",
  RENEWED: "DEPOSIT_RENEWED",
};

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();

    const actorId = getUserId(session)!;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    const body = await req.json();
    const { status: newStatus, notes } = StatusChangeSchema.parse(body);

    const deposit = await prisma.deposit.findUnique({ where: { id: params.id } });
    if (!deposit) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    // Check transition validity (server-enforced)
    if (!isValidTransition(deposit.status, newStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status transition: ${deposit.status} → ${newStatus}`,
        },
        { status: 422 }
      );
    }

    // Check permission for this specific transition
    const requiredPerm = STATUS_PERMISSIONS[newStatus];
    if (requiredPerm) {
      requirePermission(session, requiredPerm);
    } else {
      requirePermission(session, "deposit:update");
    }

    // ── Separation of duties ───────────────────────────────────────────────────
    if (newStatus === "APPROVED" && !canApproveDeposit(actorId, deposit.createdById)) {
      throw new ForbiddenError("The creator cannot approve their own deposit");
    }

    if (newStatus === "RELEASED" && !canApproveRelease(actorId, deposit.releaseRequestedById)) {
      throw new ForbiddenError(
        "The person who requested a release cannot approve it"
      );
    }

    // ── High-value: FINANCE_MANAGER approves first, then SUPER_ADMIN must confirm ─
    if (newStatus === "APPROVED" && isHighValue(deposit.principalAmount)) {
      const role = (session.user as any)?.role as string;
      // FINANCE_MANAGER does the first approval — it sets an isHighValue flag.
      // SUPER_ADMIN confirms later via a separate step (second approver).
      // For now, FINANCE_MANAGER sets APPROVED but marks the record as awaiting SUPER_ADMIN.
      if (role !== "FINANCE_MANAGER" && role !== "SUPER_ADMIN") {
        throw new ForbiddenError("High-value deposits require FINANCE_MANAGER or SUPER_ADMIN approval");
      }
    }

    const updateData: Record<string, unknown> = { status: newStatus };
    if (newStatus === "APPROVED") {
      updateData.approvedById = actorId;
      updateData.approvedAt = new Date();
    }
    if (newStatus === "RELEASE_PENDING") {
      // Record who requested the release for SoD enforcement at the RELEASED step
      updateData.releaseRequestedById = actorId;
    }
    if (newStatus === "RELEASED") {
      updateData.releaseDate = new Date();
    }
    if (newStatus === "RENEWED") {
      updateData.renewalDate = new Date();
    }

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.deposit.update({
        where: { id: params.id },
        data: updateData,
      });

      await tx.lifecycleEvent.create({
        data: {
          depositId: params.id,
          fromStatus: deposit.status,
          toStatus: newStatus,
          actorId,
          notes: notes ?? null,
        },
      });

      await tx.approvalRequest.create({
        data: {
          depositId: params.id,
          actorId,
          action:
            newStatus === "APPROVED"
              ? "APPROVED"
              : newStatus === "PENDING_REVIEW"
                ? "SUBMITTED"
                : "SUBMITTED",
          notes: notes ?? null,
          requestedBy: actorId,
          isHighValue: newStatus === "APPROVED" && isHighValue(deposit.principalAmount),
        },
      });

      return u;
    });

    const auditAction =
      STATUS_AUDIT_ACTIONS[newStatus] ?? "DEPOSIT_STATUS_CHANGED";
    await auditLog({
      action: auditAction,
      actorId,
      targetType: "Deposit",
      targetId: params.id,
      ipAddress: ip,
      metadata: {
        from: deposit.status,
        to: newStatus,
        referenceNumber: deposit.referenceNumber,
      },
    });

    return ok(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
