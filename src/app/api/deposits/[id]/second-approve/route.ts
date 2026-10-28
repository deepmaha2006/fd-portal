export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { getUserId, UnauthorizedError, ForbiddenError } from "@/lib/permissions";
import { ok, handleApiError } from "@/lib/api-response";
import { checkCsrf, getClientIp } from "@/lib/csrf";
import { isHighValue } from "@/lib/maker-checker";
import { requireRecentAuth } from "@/lib/reauth";

const SecondApproveSchema = z.object({
  notes: z.string().max(2000).optional(),
});

/**
 * POST /api/deposits/[id]/second-approve
 *
 * SUPER_ADMIN confirms a high-value deposit after FINANCE_MANAGER's first approval.
 * Updates the ApprovalRequest record with secondApproverId and secondApprovedAt.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const csrf = checkCsrf(req);
    if (!csrf.ok) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const ip = getClientIp(req);

    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();

    const actorId = getUserId(session)!;
    const role = (session.user as any)?.role as string;

    if (role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Only SUPER_ADMIN can provide second approval");
    }

    // High-value second approval requires fresh authentication (within 5 minutes)
    await requireRecentAuth(req, 300);

    const body = await req.json();
    const { notes } = SecondApproveSchema.parse(body);

    const deposit = await prisma.deposit.findUnique({ where: { id: params.id } });
    if (!deposit) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    if (deposit.status !== "APPROVED") {
      return NextResponse.json(
        { success: false, error: "Second approval only applies to deposits in APPROVED status" },
        { status: 422 }
      );
    }

    if (!isHighValue(deposit.principalAmount)) {
      return NextResponse.json(
        { success: false, error: "Second approval is only required for high-value deposits" },
        { status: 422 }
      );
    }

    // Find the pending high-value approval request
    const approvalRequest = await prisma.approvalRequest.findFirst({
      where: {
        depositId: params.id,
        isHighValue: true,
        secondApproverId: null,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!approvalRequest) {
      return NextResponse.json(
        { success: false, error: "No pending high-value approval request found for this deposit" },
        { status: 422 }
      );
    }

    // SUPER_ADMIN must not be the same as the first approver (SoD)
    if (approvalRequest.actorId === actorId) {
      throw new ForbiddenError("The first approver cannot also provide the second approval");
    }

    const updated = await prisma.approvalRequest.update({
      where: { id: approvalRequest.id },
      data: {
        secondApproverId: actorId,
        secondApprovedAt: new Date(),
        notes: notes ?? approvalRequest.notes,
      },
    });

    await auditLog({
      action: "DEPOSIT_APPROVED",
      actorId,
      targetType: "Deposit",
      targetId: params.id,
      ipAddress: ip,
      metadata: {
        step: "second_approval",
        approvalRequestId: approvalRequest.id,
        referenceNumber: deposit.referenceNumber,
        principalAmount: deposit.principalAmount,
      },
    });

    return ok({ approvalRequestId: updated.id, secondApprovedAt: updated.secondApprovedAt });
  } catch (err) {
    return handleApiError(err);
  }
}
