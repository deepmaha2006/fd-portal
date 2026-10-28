export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { getUserId, getUserRole, UnauthorizedError, ForbiddenError } from "@/lib/permissions";
import { ok, handleApiError } from "@/lib/api-response";
import type { PaymentRequestStatus } from "@prisma/client";

// ─── Transition Map ───────────────────────────────────────────────────────────
// SUBMITTED → UNDER_REVIEW (Officer only, reviewer != creator)
// UNDER_REVIEW → APPROVED | REJECTED (Manager only)
// APPROVED → PROCESSING (Manager)
// PROCESSING → COMPLETED (Manager)
// SUBMITTED | UNDER_REVIEW → CANCELLED (Client: own; Manager: any)

type Transition = {
  allowedFrom: PaymentRequestStatus[];
  requiredRoles: string[];
};

const TRANSITIONS: Record<PaymentRequestStatus, Transition | undefined> = {
  UNDER_REVIEW: {
    allowedFrom: ["SUBMITTED"],
    requiredRoles: ["SUPER_ADMIN", "ADMIN", "FINANCE_MANAGER", "FINANCE_OFFICER"],
  },
  APPROVED: {
    allowedFrom: ["UNDER_REVIEW"],
    requiredRoles: ["SUPER_ADMIN", "ADMIN", "FINANCE_MANAGER"],
  },
  REJECTED: {
    allowedFrom: ["SUBMITTED", "UNDER_REVIEW"],
    requiredRoles: ["SUPER_ADMIN", "ADMIN", "FINANCE_MANAGER"],
  },
  PROCESSING: {
    allowedFrom: ["APPROVED"],
    requiredRoles: ["SUPER_ADMIN", "ADMIN", "FINANCE_MANAGER"],
  },
  COMPLETED: {
    allowedFrom: ["PROCESSING"],
    requiredRoles: ["SUPER_ADMIN", "ADMIN", "FINANCE_MANAGER"],
  },
  CANCELLED: {
    allowedFrom: ["SUBMITTED", "UNDER_REVIEW"],
    requiredRoles: ["CLIENT", "SUPER_ADMIN", "ADMIN", "FINANCE_MANAGER"],
  },
  SUBMITTED: undefined, // terminal in reverse; cannot transition TO SUBMITTED
};

const UpdateStatusSchema = z.object({
  status: z.enum([
    "UNDER_REVIEW",
    "APPROVED",
    "REJECTED",
    "PROCESSING",
    "COMPLETED",
    "CANCELLED",
  ]),
  notes: z.string().max(1000).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();

    const userId = getUserId(session)!;
    const role = getUserRole(session)!;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    // Parse body exactly once
    const body = await req.json();
    const data = UpdateStatusSchema.parse(body);

    const pr = await prisma.paymentRequest.findUnique({
      where: { id: params.id },
      select: { id: true, clientId: true, status: true, reviewedById: true },
    });

    if (!pr) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // ── IDOR check ─────────────────────────────────────────────────────────────
    const isClient = role === "CLIENT";
    if (isClient && pr.clientId !== userId) {
      throw new ForbiddenError("Access denied");
    }

    // ── Transition validation ──────────────────────────────────────────────────
    const transition = TRANSITIONS[data.status];
    if (!transition) {
      return NextResponse.json({ error: "Invalid target status" }, { status: 422 });
    }

    if (!transition.allowedFrom.includes(pr.status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${pr.status} to ${data.status}` },
        { status: 422 }
      );
    }

    if (!transition.requiredRoles.includes(role)) {
      await auditLog({
        action: "PERMISSION_DENIED",
        actorId: userId,
        targetType: "PaymentRequest",
        targetId: params.id,
        outcome: "FAILURE",
        ipAddress: ip,
        metadata: { reason: "invalid_role_for_transition", role, targetStatus: data.status },
      });
      throw new ForbiddenError(
        `Role ${role} cannot move a request to ${data.status}`
      );
    }

    // ── Separation of duties: reviewer cannot be creator ──────────────────────
    if (data.status === "UNDER_REVIEW" && pr.clientId === userId) {
      throw new ForbiddenError("The creator cannot move their own request to UNDER_REVIEW");
    }

    // ── Update ─────────────────────────────────────────────────────────────────
    const isStaffAction = !isClient;
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.paymentRequest.update({
        where: { id: params.id },
        data: {
          status: data.status,
          reviewedById: isStaffAction ? userId : undefined,
          reviewedAt: isStaffAction ? new Date() : undefined,
          reviewNotes: data.notes ?? undefined,
        },
      });

      await tx.paymentRequestHistory.create({
        data: {
          requestId: params.id,
          status: data.status,
          actorId: userId,
          notes: data.notes,
        },
      });

      return result;
    });

    await auditLog({
      action: "DEPOSIT_STATUS_CHANGED",
      actorId: userId,
      targetType: "PaymentRequest",
      targetId: params.id,
      ipAddress: ip,
      metadata: { from: pr.status, to: data.status },
    });

    return ok(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
