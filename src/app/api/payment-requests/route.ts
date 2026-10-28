export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserId, UnauthorizedError } from "@/lib/permissions";
import { ok, created, handleApiError } from "@/lib/api-response";

const CreateRequestSchema = z.object({
  type: z.enum(["NEW_DEPOSIT", "RENEWAL", "RELEASE", "PAYMENT_QUERY", "OTHER"]),
  description: z.string().min(10).max(2000),
  amount: z.number().positive().optional(),
  currency: z.string().default("INR"),
  bankName: z.string().max(200).optional(),
  accountNumber: z.string().max(50).optional(),
  urgency: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  depositId: z.string().optional(),
});

function generateRequestNumber() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PR-${ts}-${rand}`;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();

    const userId = getUserId(session)!;
    const role = (session.user as any)?.role as string;
    const page = Number(req.nextUrl.searchParams.get("page") ?? 1);
    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 20), 100);
    const status = req.nextUrl.searchParams.get("status");

    // Clients see only their own requests; admins/managers see all
    const isAdmin = ["SUPER_ADMIN", "ADMIN", "FINANCE_MANAGER"].includes(role);

    const where: Record<string, unknown> = {};
    if (!isAdmin) where.clientId = userId;
    if (status) where.status = status;

    const [requests, total] = await prisma.$transaction([
      prisma.paymentRequest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          client: { select: { name: true, email: true } },
          reviewedBy: { select: { name: true } },
          statusHistory: { orderBy: { createdAt: "asc" } },
        },
      }),
      prisma.paymentRequest.count({ where }),
    ]);

    return ok({ requests, pagination: { page, limit, total } });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();

    const userId = getUserId(session)!;
    const role = (session.user as any)?.role as string;

    // Clients must have approved KYC before submitting payment requests
    if (role === "CLIENT") {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isKycVerified: true },
      });
      if (!user?.isKycVerified) {
        return NextResponse.json(
          { success: false, error: "KYC_REQUIRED", message: "Your identity must be verified before submitting requests. Please complete KYC verification in Settings." },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const data = CreateRequestSchema.parse(body);

    const request = await prisma.$transaction(async (tx) => {
      const pr = await tx.paymentRequest.create({
        data: {
          requestNumber: generateRequestNumber(),
          clientId: userId,
          type: data.type,
          status: "SUBMITTED",
          description: data.description,
          amount: data.amount,
          currency: data.currency,
          bankName: data.bankName,
          accountNumber: data.accountNumber,
          urgency: data.urgency,
          depositId: data.depositId,
        },
      });

      await tx.paymentRequestHistory.create({
        data: {
          requestId: pr.id,
          status: "SUBMITTED",
          actorId: userId,
          notes: "Request submitted by client",
        },
      });

      return pr;
    });

    return created(request);
  } catch (err) {
    return handleApiError(err);
  }
}
