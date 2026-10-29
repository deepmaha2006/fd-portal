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
  hasPermission,
  UnauthorizedError,
} from "@/lib/permissions";
import {
  ok,
  created,
  handleApiError,
} from "@/lib/api-response";
import type { UserRole } from "@prisma/client";
import { generateReferenceNumber } from "@/lib/deposit-utils";
import { encryptField, decryptField } from "@/lib/field-encrypt";
import type { DepositType, DepositStatus } from "@prisma/client";

// ─── Input Validation Schemas ─────────────────────────────────────────────────

const DepositQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  type: z.string().optional(),
  bankId: z.string().optional(),
  departmentId: z.string().optional(),
  ownerId: z.string().optional(),
  search: z.string().max(200).optional(),
  sortBy: z
    .enum(["createdAt", "maturityDate", "expiryDate", "principalAmount", "referenceNumber"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const CreateDepositSchema = z.object({
  depositType: z.enum([
    "FIXED_DEPOSIT",
    "SECURITY_DEPOSIT",
    "BANK_GUARANTEE",
    "EARNEST_MONEY",
    "LEASE_DEPOSIT",
    "OTHER",
  ]),
  certificateNumber: z.string().max(100).optional(),
  bankId: z.string().min(1).optional(),
  branchId: z.string().min(1).optional(),
  accountNumber: z.string().max(50).optional(),
  beneficiaryId: z.string().min(1).optional(),
  issuingOrganization: z.string().max(200).optional(),
  vendorReference: z.string().max(200).optional(),
  contractNumber: z.string().max(100).optional(),
  principalAmount: z.coerce
    .number()
    .positive("Principal must be positive")
    .max(999_999_999_999),
  currency: z.string().length(3).default("INR"),
  interestRate: z.coerce.number().min(0).max(100).optional(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  maturityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  departmentId: z.string().min(1).optional(),
  ownerId: z.string().min(1).optional(),
  isRenewalEligible: z.boolean().default(true),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
}).refine(
  (d) => !d.maturityDate || d.maturityDate >= d.issueDate,
  { message: "Maturity date must be on or after issue date", path: ["maturityDate"] }
).refine(
  (d) => !d.expiryDate || d.expiryDate >= d.issueDate,
  { message: "Expiry date must be on or after issue date", path: ["expiryDate"] }
);

// ─── GET /api/deposits ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();
    requirePermission(session, "deposit:read");

    const role = (session.user as any)?.role as UserRole;
    const isViewer = role === "VIEWER";

    const params = DepositQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams)
    );

    const skip = (params.page - 1) * params.limit;

    // Build WHERE clause — all filters applied server-side
    const where: Record<string, unknown> = {};

    if (params.status) {
      where.status = params.status as DepositStatus;
    }
    if (params.type) {
      where.depositType = params.type as DepositType;
    }
    if (params.bankId) {
      where.bankId = params.bankId;
    }
    if (params.departmentId) {
      where.departmentId = params.departmentId;
    }
    if (params.ownerId) {
      where.ownerId = params.ownerId;
    }
    if (params.search) {
      where.OR = [
        { referenceNumber: { contains: params.search, mode: "insensitive" } },
        { certificateNumber: { contains: params.search, mode: "insensitive" } },
        { contractNumber: { contains: params.search, mode: "insensitive" } },
        { vendorReference: { contains: params.search, mode: "insensitive" } },
        { beneficiary: { name: { contains: params.search, mode: "insensitive" } } },
        { bank: { name: { contains: params.search, mode: "insensitive" } } },
      ];
    }
    if (params.dateFrom) {
      where.maturityDate = { gte: new Date(params.dateFrom) };
    }
    if (params.dateTo) {
      where.maturityDate = {
        ...(where.maturityDate as object),
        lte: new Date(params.dateTo),
      };
    }

    const [deposits, total] = await prisma.$transaction([
      prisma.deposit.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { [params.sortBy]: params.sortOrder },
        include: {
          bank: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
          beneficiary: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
          owner: { select: { id: true, name: true, email: true } },
          _count: { select: { documents: true } },
        },
      }),
      prisma.deposit.count({ where }),
    ]);

    // Decrypt accountNumber on the way out for non-VIEWER roles
    const decrypted = !isViewer
      ? deposits.map((d) => ({
          ...d,
          accountNumber: decryptField(d.accountNumber),
        }))
      : deposits;

    const sanitized = isViewer
      ? decrypted.map((d) => ({
          id: d.id,
          referenceNumber: d.referenceNumber,
          depositType: d.depositType,
          status: d.status,
          principalAmount: d.principalAmount,
          currency: d.currency,
          interestRate: d.interestRate,
          issueDate: d.issueDate,
          maturityDate: d.maturityDate,
          expiryDate: d.expiryDate,
          bank: d.bank,
          department: d.department,
        }))
      : decrypted;

    return ok({
      deposits: sanitized,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        pages: Math.ceil(total / params.limit),
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

// ─── POST /api/deposits ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();
    requirePermission(session, "deposit:create");

    const actorId = getUserId(session)!;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    const body = await req.json();
    const data = CreateDepositSchema.parse(body);

    // Generate reference number — get next sequence from DB
    const count = await prisma.deposit.count();
    const referenceNumber = generateReferenceNumber(count + 1);

    // If ownerId provided, verify the user exists
    if (data.ownerId) {
      const owner = await prisma.user.findUnique({ where: { id: data.ownerId } });
      if (!owner) {
        return handleApiError(
          Object.assign(new Error("Validation failed"), { name: "ZodError" })
        );
      }
    }

    const deposit = await prisma.$transaction(async (tx) => {
      const created = await tx.deposit.create({
        data: {
          referenceNumber,
          depositType: data.depositType,
          certificateNumber: data.certificateNumber,
          bankId: data.bankId,
          branchId: data.branchId,
          accountNumber: data.accountNumber ? encryptField(data.accountNumber) : null,
          beneficiaryId: data.beneficiaryId,
          issuingOrganization: data.issuingOrganization,
          vendorReference: data.vendorReference,
          contractNumber: data.contractNumber,
          principalAmount: data.principalAmount,
          currency: data.currency,
          interestRate: data.interestRate,
          issueDate: new Date(data.issueDate),
          maturityDate: data.maturityDate ? new Date(data.maturityDate) : null,
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
          departmentId: data.departmentId,
          ownerId: data.ownerId,
          isRenewalEligible: data.isRenewalEligible,
          notes: data.notes,
          tags: data.tags,
          createdById: actorId,
          status: "DRAFT",
        },
      });

      // Record lifecycle event
      await tx.lifecycleEvent.create({
        data: {
          depositId: created.id,
          toStatus: "DRAFT",
          actorId,
          notes: "Deposit created",
        },
      });

      return created;
    });

    await auditLog({
      action: "DEPOSIT_CREATED",
      actorId,
      targetType: "Deposit",
      targetId: deposit.id,
      ipAddress: ip,
      metadata: { referenceNumber: deposit.referenceNumber },
    });

    return created(deposit);
  } catch (err) {
    return handleApiError(err);
  }
}
