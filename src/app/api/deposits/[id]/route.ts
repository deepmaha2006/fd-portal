export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import {
  requirePermission,
  getUserId,
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/permissions";
import { ok, noContent, handleApiError } from "@/lib/api-response";
import { encryptField, decryptField } from "@/lib/field-encrypt";
import { NextResponse } from "next/server";

const UpdateDepositSchema = z.object({
  certificateNumber: z.string().max(100).optional(),
  bankId: z.string().cuid().optional().nullable(),
  branchId: z.string().cuid().optional().nullable(),
  accountNumber: z.string().max(50).optional().nullable(),
  beneficiaryId: z.string().cuid().optional().nullable(),
  issuingOrganization: z.string().max(200).optional().nullable(),
  vendorReference: z.string().max(200).optional().nullable(),
  contractNumber: z.string().max(100).optional().nullable(),
  principalAmount: z.coerce.number().positive().max(999_999_999_999).optional(),
  currency: z.string().length(3).optional(),
  interestRate: z.coerce.number().min(0).max(100).optional().nullable(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  maturityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  departmentId: z.string().cuid().optional().nullable(),
  ownerId: z.string().cuid().optional().nullable(),
  isRenewalEligible: z.boolean().optional(),
  notes: z.string().max(5000).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

// ─── GET /api/deposits/[id] ───────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();
    requirePermission(session, "deposit:read");

    const deposit = await prisma.deposit.findUnique({
      where: { id: params.id },
      include: {
        bank: true,
        branch: true,
        beneficiary: true,
        department: true,
        owner: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
        documents: {
          where: { isArchived: false },
          orderBy: { uploadedAt: "desc" },
        },
        lifecycleEvents: {
          orderBy: { occurredAt: "asc" },
          include: { deposit: false },
        },
        approvalRequests: {
          orderBy: { createdAt: "desc" },
          include: { actor: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    if (!deposit) {
      return NextResponse.json(
        { success: false, error: "Deposit not found" },
        { status: 404 }
      );
    }

    // Audit significant access
    const actorId = getUserId(session);
    await auditLog({
      action: "DEPOSIT_VIEWED",
      actorId: actorId ?? undefined,
      targetType: "Deposit",
      targetId: deposit.id,
    });

    return ok({
      ...deposit,
      accountNumber: decryptField(deposit.accountNumber),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

// ─── PATCH /api/deposits/[id] ─────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();
    requirePermission(session, "deposit:update");

    const actorId = getUserId(session)!;
    const role = (session.user as any)?.role as string;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    const existing = await prisma.deposit.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    // Row-level access: FINANCE_OFFICER can only edit deposits they created
    if (role === "FINANCE_OFFICER" && existing.createdById !== actorId) {
      throw new ForbiddenError("FINANCE_OFFICER can only update deposits they created");
    }

    // Cannot update terminal deposits
    if (["RELEASED", "CANCELLED", "ARCHIVED", "RENEWED"].includes(existing.status)) {
      return NextResponse.json(
        { success: false, error: "Cannot update a deposit in terminal status" },
        { status: 422 }
      );
    }

    const body = await req.json();
    const data = UpdateDepositSchema.parse(body);

    const updated = await prisma.deposit.update({
      where: { id: params.id },
      data: {
        ...data,
        accountNumber: data.accountNumber !== undefined
          ? data.accountNumber ? encryptField(data.accountNumber) : null
          : undefined,
        issueDate: data.issueDate ? new Date(data.issueDate) : undefined,
        maturityDate: data.maturityDate !== undefined
          ? data.maturityDate ? new Date(data.maturityDate) : null
          : undefined,
        expiryDate: data.expiryDate !== undefined
          ? data.expiryDate ? new Date(data.expiryDate) : null
          : undefined,
      },
    });

    await auditLog({
      action: "DEPOSIT_UPDATED",
      actorId,
      targetType: "Deposit",
      targetId: updated.id,
      ipAddress: ip,
      metadata: { updatedFields: Object.keys(data) },
    });

    return ok({
      ...updated,
      accountNumber: decryptField(updated.accountNumber),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

// ─── DELETE /api/deposits/[id] (soft delete, requires reason) ────────────────

const SoftDeleteSchema = z.object({
  reason: z.string().min(10, "Reason must be at least 10 characters").max(500),
});

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();
    // Only SUPER_ADMIN and ADMIN may soft-delete deposits
    requirePermission(session, "document:delete"); // reuses the SUPER_ADMIN+ADMIN gate

    const actorId = getUserId(session)!;
    const actorRole = (session.user as any)?.role as string;
    if (!["SUPER_ADMIN", "ADMIN"].includes(actorRole)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    const body = await req.json();
    const { reason } = SoftDeleteSchema.parse(body);

    const existing = await prisma.deposit.findUnique({ where: { id: params.id } });
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    await prisma.deposit.update({
      where: { id: params.id },
      data: { deletedAt: new Date(), deletedById: actorId, deleteReason: reason },
    });

    await auditLog({
      action: "DEPOSIT_DELETE_REQUESTED",
      actorId,
      targetType: "Deposit",
      targetId: params.id,
      ipAddress: ip,
      metadata: { referenceNumber: existing.referenceNumber, reason },
    });

    return noContent();
  } catch (err) {
    return handleApiError(err);
  }
}
