import { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { DepositsTable } from "@/components/deposits/deposits-table";
import { Plus, Download } from "lucide-react";
import type { UserRole } from "@prisma/client";

export const metadata: Metadata = { title: "Deposits" };

export default async function DepositsPage({
  searchParams,
}: {
  searchParams: {
    page?: string;
    status?: string;
    type?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userRole = (session.user as any)?.role as UserRole;
  const canCreate = hasPermission(userRole, "deposit:create");
  const canExport = hasPermission(userRole, "deposit:export");

  const page = Number(searchParams.page ?? 1);
  const limit = 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.type) where.depositType = searchParams.type;
  if (searchParams.search) {
    where.OR = [
      { referenceNumber: { contains: searchParams.search, mode: "insensitive" } },
      { certificateNumber: { contains: searchParams.search, mode: "insensitive" } },
      { beneficiary: { name: { contains: searchParams.search, mode: "insensitive" } } },
      { bank: { name: { contains: searchParams.search, mode: "insensitive" } } },
    ];
  }

  const sortBy = (searchParams.sortBy as string) ?? "createdAt";
  const sortOrder = (searchParams.sortOrder as "asc" | "desc") ?? "desc";
  const validSortBy = ["createdAt", "maturityDate", "principalAmount", "referenceNumber"];
  const safeSortBy = validSortBy.includes(sortBy) ? sortBy : "createdAt";

  const [deposits, total] = await prisma.$transaction([
    prisma.deposit.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [safeSortBy]: sortOrder },
      include: {
        bank: { select: { name: true } },
        beneficiary: { select: { name: true } },
        department: { select: { name: true } },
        owner: { select: { name: true } },
        _count: { select: { documents: true } },
      },
    }),
    prisma.deposit.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Deposits</h1>
          <p className="text-slate-500 text-sm mt-1">
            {total.toLocaleString()} deposit{total !== 1 ? "s" : ""} total
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canExport && (
            <a
              href="/api/deposits/export"
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Download size={14} /> Export CSV
            </a>
          )}
          {canCreate && (
            <Link
              href="/deposits/new"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              <Plus size={14} /> New Deposit
            </Link>
          )}
        </div>
      </div>

      <DepositsTable
        deposits={deposits}
        total={total}
        page={page}
        limit={limit}
        searchParams={searchParams}
      />
    </div>
  );
}
