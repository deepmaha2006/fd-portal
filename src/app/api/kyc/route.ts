export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserId, hasPermission, UnauthorizedError, ForbiddenError } from "@/lib/permissions";
import { ok, created, handleApiError, tooManyRequests } from "@/lib/api-response";
import { auditLog } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkCsrf, getClientIp } from "@/lib/csrf";
import { env } from "@/lib/env";
import type { UserRole } from "@prisma/client";

const SubmitKycSchema = z.object({
  documentType: z.enum(["AADHAAR", "PAN_CARD", "PASSPORT", "DRIVING_LICENSE", "VOTER_ID", "BANK_STATEMENT", "UTILITY_BILL", "OTHER"]),
  documentNumber: z.string().min(4).max(30).trim().optional(),
  fullName: z.string().min(2).max(100).trim(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();

    const userId = getUserId(session)!;
    const role = (session.user as any)?.role as UserRole;
    const isAdmin = hasPermission(role, "user:manage");

    if (isAdmin) {
      const status = req.nextUrl.searchParams.get("status");
      const where = status ? { status: status as any } : {};
      const records = await prisma.kycVerification.findMany({
        where,
        orderBy: { submittedAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true, department: true, createdAt: true } },
          reviewedBy: { select: { name: true } },
        },
      });
      return ok(records);
    }

    // Client: return own record
    const record = await prisma.kycVerification.findUnique({
      where: { userId },
      include: { reviewedBy: { select: { name: true } } },
    });
    return ok(record ?? null);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const csrf = checkCsrf(req);
    if (!csrf.ok) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const ip = getClientIp(req);

    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();

    const userId = getUserId(session)!;
    const role = (session.user as any)?.role as UserRole;
    if (role !== "CLIENT") throw new ForbiddenError("Only clients can submit KYC verification");

    const rl = await checkRateLimit(
      `kyc:${userId}`,
      env.RATE_LIMIT_KYC_MAX,
      env.RATE_LIMIT_KYC_WINDOW_SECONDS
    );
    if (!rl.allowed) return tooManyRequests(rl.resetAt);

    const body = await req.json();
    const data = SubmitKycSchema.parse(body);

    const existing = await prisma.kycVerification.findUnique({ where: { userId } });

    let record;
    if (existing) {
      if (existing.status === "APPROVED") {
        return NextResponse.json({ success: false, error: "Your KYC is already approved." }, { status: 422 });
      }
      record = await prisma.kycVerification.update({
        where: { userId },
        data: {
          documentType: data.documentType,
          documentNumber: data.documentNumber,
          fullName: data.fullName,
          status: "PENDING_REVIEW",
          reviewedById: null,
          reviewedAt: null,
          reviewNotes: null,
          submittedAt: new Date(),
        },
      });
    } else {
      record = await prisma.kycVerification.create({
        data: {
          userId,
          documentType: data.documentType,
          documentNumber: data.documentNumber,
          fullName: data.fullName,
        },
      });
    }

    await auditLog({
      action: "KYC_SUBMITTED",
      actorId: userId,
      targetType: "KycVerification",
      targetId: record.id,
    });

    return created({ id: record.id, status: record.status });
  } catch (err) {
    return handleApiError(err);
  }
}
