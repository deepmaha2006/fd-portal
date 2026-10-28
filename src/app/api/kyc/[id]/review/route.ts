export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserId, hasPermission, UnauthorizedError, ForbiddenError } from "@/lib/permissions";
import { ok, handleApiError } from "@/lib/api-response";
import { auditLog } from "@/lib/audit";
import type { UserRole } from "@prisma/client";

const ReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNotes: z.string().max(500).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();

    const actorId = getUserId(session)!;
    const role = (session.user as any)?.role as UserRole;
    if (!hasPermission(role, "user:manage")) throw new ForbiddenError("Admin access required");

    const kyc = await prisma.kycVerification.findUnique({
      where: { id: params.id },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!kyc) {
      return NextResponse.json({ error: "KYC record not found" }, { status: 404 });
    }

    const body = await req.json();
    const data = ReviewSchema.parse(body);

    await prisma.$transaction(async (tx) => {
      await tx.kycVerification.update({
        where: { id: params.id },
        data: {
          status: data.status,
          reviewedById: actorId,
          reviewedAt: new Date(),
          reviewNotes: data.reviewNotes,
        },
      });

      if (data.status === "APPROVED") {
        await tx.user.update({
          where: { id: kyc.userId },
          data: { isKycVerified: true },
        });
      } else {
        await tx.user.update({
          where: { id: kyc.userId },
          data: { isKycVerified: false },
        });
      }
    });

    await auditLog({
      action: data.status === "APPROVED" ? "KYC_APPROVED" : "KYC_REJECTED",
      actorId,
      targetType: "KycVerification",
      targetId: params.id,
      metadata: { userId: kyc.userId, reviewNotes: data.reviewNotes },
    });

    return ok({ message: `KYC ${data.status === "APPROVED" ? "approved" : "rejected"} successfully` });
  } catch (err) {
    return handleApiError(err);
  }
}
