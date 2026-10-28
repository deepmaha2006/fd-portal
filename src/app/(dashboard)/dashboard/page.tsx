import { Metadata } from "next";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { addDays } from "date-fns";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { UpcomingMaturities } from "@/components/dashboard/upcoming-maturities";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { StatusBreakdown } from "@/components/dashboard/status-breakdown";

export const metadata: Metadata = { title: "Dashboard" };

async function _getDashboardData() {
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
    pendingClientRequests,
    recentActivity,
    statusBreakdown,
    upcomingMaturities,
  ] = await Promise.all([
    prisma.deposit.count({
      where: { status: { in: ["ACTIVE", "APPROVED", "MATURING_SOON"] } },
    }),
    prisma.deposit.aggregate({
      where: { status: { in: ["ACTIVE", "APPROVED", "MATURING_SOON"] } },
      _sum: { principalAmount: true },
    }),
    prisma.deposit.count({
      where: {
        status: { in: ["ACTIVE", "APPROVED", "MATURING_SOON"] },
        maturityDate: { gte: now, lte: thirtyDaysOut },
      },
    }),
    prisma.deposit.count({
      where: {
        status: { in: ["ACTIVE", "APPROVED", "MATURING_SOON"] },
        maturityDate: { gte: now, lte: ninetyDaysOut },
      },
    }),
    prisma.deposit.count({
      where: {
        status: { in: ["ACTIVE", "APPROVED", "MATURING_SOON", "MATURED"] },
        maturityDate: { lt: now },
      },
    }),
    prisma.deposit.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.paymentRequest.count({
      where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
    }),
    prisma.lifecycleEvent.findMany({
      take: 8,
      orderBy: { occurredAt: "desc" },
      include: {
        deposit: { select: { referenceNumber: true, depositType: true, id: true } },
      },
    }),
    prisma.deposit.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.deposit.findMany({
      where: {
        status: { in: ["ACTIVE", "APPROVED", "MATURING_SOON"] },
        maturityDate: { gte: now, lte: ninetyDaysOut },
      },
      orderBy: { maturityDate: "asc" },
      take: 8,
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
    }),
  ]);

  return {
    summary: {
      totalActive,
      totalPrincipal: Number(totalPrincipal._sum.principalAmount ?? 0),
      expiringIn30,
      expiringIn90,
      overdue,
      pendingApproval,
      pendingClientRequests,
    },
    recentActivity,
    statusBreakdown: statusBreakdown.map((s) => ({
      status: s.status,
      count: s._count.status,
      totalPrincipal: 0,
    })),
    upcomingMaturities,
  };
}

const emptyData = {
  summary: { totalActive: 0, totalPrincipal: 0, expiringIn30: 0, expiringIn90: 0, overdue: 0, pendingApproval: 0, pendingClientRequests: 0 },
  recentActivity: [] as Awaited<ReturnType<typeof _getDashboardData>>["recentActivity"],
  statusBreakdown: [] as { status: string; count: number; totalPrincipal: number }[],
  upcomingMaturities: [] as Awaited<ReturnType<typeof _getDashboardData>>["upcomingMaturities"],
};

export default async function DashboardPage() {
  const session = await getSession();
  const data = await _getDashboardData().catch(() => emptyData);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">
          Overview of all deposit activities
        </p>
      </div>

      <DashboardStats summary={data.summary} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <UpcomingMaturities deposits={data.upcomingMaturities} />
        </div>
        <div>
          <StatusBreakdown breakdown={data.statusBreakdown} />
        </div>
      </div>

      <RecentActivity events={data.recentActivity} />
    </div>
  );
}
