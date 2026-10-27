import { Metadata } from "next";
import { unstable_cache } from "next/cache";
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
      _sum: { principalAmount: true },
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
    },
    recentActivity,
    statusBreakdown: statusBreakdown.map((s) => ({
      status: s.status,
      count: s._count.status,
      totalPrincipal: Number(s._sum.principalAmount ?? 0),
    })),
    upcomingMaturities,
  };
}

// Cache dashboard stats for 60 seconds — data is global (not user-specific)
const getDashboardData = unstable_cache(_getDashboardData, ["dashboard-stats"], {
  revalidate: 60,
});

export default async function DashboardPage() {
  const session = await getSession();
  const data = await getDashboardData();

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
