import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { addDays } from "date-fns";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requirePermission, UnauthorizedError } from "@/lib/permissions";
import { ok, handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();
    requirePermission(session, "deposit:read");

    const now = new Date();
    const thirtyDaysOut = addDays(now, 30);
    const ninetyDaysOut = addDays(now, 90);

    const [
      totalActive,
      totalPrincipal,
      expiringIn30,
      expiringIn90,
      overdue,
      pendingApproval,
      recentActivity,
      statusBreakdown,
    ] = await Promise.all([
      // Total active deposits
      prisma.deposit.count({
        where: { status: { in: ["ACTIVE", "APPROVED", "MATURING_SOON"] } },
      }),

      // Total principal of active deposits
      prisma.deposit.aggregate({
        where: { status: { in: ["ACTIVE", "APPROVED", "MATURING_SOON"] } },
        _sum: { principalAmount: true },
      }),

      // Expiring within 30 days
      prisma.deposit.count({
        where: {
          status: { in: ["ACTIVE", "APPROVED", "MATURING_SOON"] },
          maturityDate: { gte: now, lte: thirtyDaysOut },
        },
      }),

      // Expiring within 90 days
      prisma.deposit.count({
        where: {
          status: { in: ["ACTIVE", "APPROVED", "MATURING_SOON"] },
          maturityDate: { gte: now, lte: ninetyDaysOut },
        },
      }),

      // Overdue (maturity date passed, still active)
      prisma.deposit.count({
        where: {
          status: { in: ["ACTIVE", "APPROVED", "MATURING_SOON", "MATURED"] },
          maturityDate: { lt: now },
        },
      }),

      // Pending approval
      prisma.deposit.count({ where: { status: "PENDING_REVIEW" } }),

      // Recent lifecycle events (last 10)
      prisma.lifecycleEvent.findMany({
        take: 10,
        orderBy: { occurredAt: "desc" },
        include: {
          deposit: {
            select: { referenceNumber: true, depositType: true, id: true },
          },
        },
      }),

      // Status breakdown
      prisma.deposit.groupBy({
        by: ["status"],
        _count: { status: true },
        _sum: { principalAmount: true },
      }),
    ]);

    // Upcoming maturities (next 90 days, sorted)
    const upcomingMaturities = await prisma.deposit.findMany({
      where: {
        status: { in: ["ACTIVE", "APPROVED", "MATURING_SOON"] },
        maturityDate: { gte: now, lte: ninetyDaysOut },
      },
      orderBy: { maturityDate: "asc" },
      take: 10,
      select: {
        id: true,
        referenceNumber: true,
        depositType: true,
        principalAmount: true,
        currency: true,
        maturityDate: true,
        status: true,
        bank: { select: { name: true } },
      },
    });

    return ok({
      summary: {
        totalActive,
        totalPrincipal: totalPrincipal._sum.principalAmount ?? 0,
        expiringIn30,
        expiringIn90,
        overdue,
        pendingApproval,
      },
      upcomingMaturities,
      recentActivity,
      statusBreakdown: statusBreakdown.map((s) => ({
        status: s.status,
        count: s._count.status,
        totalPrincipal: s._sum.principalAmount ?? 0,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
