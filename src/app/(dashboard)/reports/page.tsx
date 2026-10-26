import { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = (session.user as any)?.role as UserRole;
  if (!hasPermission(role, "deposit:export")) redirect("/dashboard");

  const [byStatus, byType, byBank, maturityBuckets] = await Promise.all([
    // Status breakdown
    prisma.deposit.groupBy({
      by: ["status"],
      _count: { id: true },
      _sum: { principalAmount: true },
    }),
    // Type breakdown
    prisma.deposit.groupBy({
      by: ["depositType"],
      _count: { id: true },
      _sum: { principalAmount: true },
    }),
    // Bank-wise totals
    prisma.deposit.groupBy({
      by: ["bankId"],
      _count: { id: true },
      _sum: { principalAmount: true },
      where: { bankId: { not: null } },
    }),
    // Maturity aging buckets (next 90 days)
    prisma.$queryRaw<Array<{ bucket: string; count: bigint; total: string }>>`
      SELECT
        CASE
          WHEN maturity_date < NOW() THEN 'Overdue'
          WHEN maturity_date <= NOW() + INTERVAL '7 days' THEN '0-7 days'
          WHEN maturity_date <= NOW() + INTERVAL '30 days' THEN '8-30 days'
          WHEN maturity_date <= NOW() + INTERVAL '90 days' THEN '31-90 days'
          ELSE 'Beyond 90 days'
        END AS bucket,
        COUNT(*) AS count,
        COALESCE(SUM(principal_amount), 0)::text AS total
      FROM deposits
      WHERE status NOT IN ('CANCELLED', 'CLOSED', 'RELEASED', 'FORFEITED')
        AND maturity_date IS NOT NULL
      GROUP BY 1
      ORDER BY MIN(maturity_date)
    `,
  ]);

  const bankIds = byBank.map((b) => b.bankId!);
  const banks = await prisma.bank.findMany({
    where: { id: { in: bankIds } },
    select: { id: true, name: true },
  });
  const bankMap = Object.fromEntries(banks.map((b) => [b.id, b.name]));

  const formatINR = (n: number | null | undefined) =>
    (n ?? 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-500 text-sm mt-1">Portfolio analytics and maturity reports</p>
      </div>

      {/* Status breakdown */}
      <ReportCard title="Deposits by Status">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500 text-xs uppercase tracking-wide">
              <th className="pb-2">Status</th>
              <th className="pb-2 text-right">Count</th>
              <th className="pb-2 text-right">Total Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {byStatus.map((row) => (
              <tr key={row.status}>
                <td className="py-2 font-medium text-slate-700">{row.status.replace(/_/g, " ")}</td>
                <td className="py-2 text-right text-slate-600">{row._count.id}</td>
                <td className="py-2 text-right text-slate-600">{formatINR(Number(row._sum.principalAmount))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ReportCard>

      {/* Type breakdown */}
      <ReportCard title="Deposits by Type">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500 text-xs uppercase tracking-wide">
              <th className="pb-2">Type</th>
              <th className="pb-2 text-right">Count</th>
              <th className="pb-2 text-right">Total Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {byType.map((row) => (
              <tr key={row.depositType}>
                <td className="py-2 font-medium text-slate-700">{row.depositType.replace(/_/g, " ")}</td>
                <td className="py-2 text-right text-slate-600">{row._count.id}</td>
                <td className="py-2 text-right text-slate-600">{formatINR(Number(row._sum.principalAmount))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ReportCard>

      {/* Maturity aging */}
      <ReportCard title="Maturity Aging">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500 text-xs uppercase tracking-wide">
              <th className="pb-2">Bucket</th>
              <th className="pb-2 text-right">Count</th>
              <th className="pb-2 text-right">Total Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {maturityBuckets.map((row) => (
              <tr key={row.bucket}>
                <td className="py-2 font-medium text-slate-700">{row.bucket}</td>
                <td className="py-2 text-right text-slate-600">{Number(row.count)}</td>
                <td className="py-2 text-right text-slate-600">{formatINR(Number(row.total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ReportCard>

      {/* Bank-wise */}
      <ReportCard title="Bank-wise Summary">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500 text-xs uppercase tracking-wide">
              <th className="pb-2">Bank</th>
              <th className="pb-2 text-right">Count</th>
              <th className="pb-2 text-right">Total Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {byBank.map((row) => (
              <tr key={row.bankId}>
                <td className="py-2 font-medium text-slate-700">{bankMap[row.bankId!] ?? row.bankId}</td>
                <td className="py-2 text-right text-slate-600">{row._count.id}</td>
                <td className="py-2 text-right text-slate-600">{formatINR(Number(row._sum.principalAmount))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ReportCard>
    </div>
  );
}

function ReportCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-base font-semibold text-slate-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}
