import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { stringify } from "csv-stringify/sync";
import { format } from "date-fns";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { requirePermission, getUserId, UnauthorizedError } from "@/lib/permissions";
import { handleApiError, tooManyRequests } from "@/lib/api-response";
import { sanitizeCsvField, formatCurrency } from "@/lib/deposit-utils";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();
    requirePermission(session, "deposit:export");

    const actorId = getUserId(session)!;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    // Rate limit exports (expensive)
    const rl = await checkRateLimit(`export:${actorId}`, 5, 3600); // 5 per hour
    if (!rl.allowed) return tooManyRequests(rl.resetAt);

    const deposits = await prisma.deposit.findMany({
      where: { status: { not: "DRAFT" } },
      include: {
        bank: { select: { name: true } },
        beneficiary: { select: { name: true } },
        department: { select: { name: true } },
        owner: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10000,
    });

    const rows = deposits.map((d) => [
      sanitizeCsvField(d.referenceNumber),
      sanitizeCsvField(d.certificateNumber),
      sanitizeCsvField(d.depositType),
      sanitizeCsvField(d.status),
      sanitizeCsvField(d.bank?.name),
      // Account number masked in exports — only show last 4 digits
      d.accountNumber
        ? sanitizeCsvField("****" + d.accountNumber.slice(-4))
        : "",
      sanitizeCsvField(d.beneficiary?.name),
      sanitizeCsvField(d.principalAmount.toString()),
      sanitizeCsvField(d.currency),
      sanitizeCsvField(d.interestRate?.toString()),
      d.issueDate ? format(d.issueDate, "yyyy-MM-dd") : "",
      d.maturityDate ? format(d.maturityDate, "yyyy-MM-dd") : "",
      d.expiryDate ? format(d.expiryDate, "yyyy-MM-dd") : "",
      sanitizeCsvField(d.department?.name),
      sanitizeCsvField(d.owner?.name),
      sanitizeCsvField(d.contractNumber),
      sanitizeCsvField(d.vendorReference),
      d.createdAt ? format(d.createdAt, "yyyy-MM-dd") : "",
    ]);

    const headers = [
      "Reference",
      "Certificate No.",
      "Type",
      "Status",
      "Bank",
      "Account No.",
      "Beneficiary",
      "Principal Amount",
      "Currency",
      "Interest Rate %",
      "Issue Date",
      "Maturity Date",
      "Expiry Date",
      "Department",
      "Owner",
      "Contract No.",
      "Vendor Reference",
      "Created Date",
    ];

    const csv = stringify([headers, ...rows]);

    await auditLog({
      action: "EXPORT_GENERATED",
      actorId,
      ipAddress: ip,
      metadata: { recordCount: deposits.length, format: "CSV" },
    });

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="deposits-export-${format(new Date(), "yyyyMMdd-HHmmss")}.csv"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
