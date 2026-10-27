"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { format } from "date-fns";
import {
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatCurrency, getMaturityUrgency, daysUntilMaturity } from "@/lib/deposit-utils";
import type { DepositStatus, DepositType } from "@prisma/client";

interface Deposit {
  id: string;
  referenceNumber: string;
  certificateNumber: string | null;
  depositType: DepositType;
  status: DepositStatus;
  principalAmount: number;
  currency: string;
  maturityDate: Date | null;
  bank: { name: string } | null;
  beneficiary: { name: string } | null;
  department: { name: string } | null;
  owner: { name: string } | null;
  _count: { documents: number };
}

const STATUS_BADGES: Record<DepositStatus, { label: string; class: string }> = {
  DRAFT: { label: "Draft", class: "bg-slate-100 text-slate-600" },
  PENDING_REVIEW: { label: "Pending Review", class: "bg-yellow-100 text-yellow-700" },
  APPROVED: { label: "Approved", class: "bg-blue-100 text-blue-700" },
  ACTIVE: { label: "Active", class: "bg-emerald-100 text-emerald-700" },
  MATURING_SOON: { label: "Maturing Soon", class: "bg-amber-100 text-amber-700" },
  MATURED: { label: "Matured", class: "bg-orange-100 text-orange-700" },
  RENEWAL_PENDING: { label: "Renewal Pending", class: "bg-indigo-100 text-indigo-700" },
  RENEWED: { label: "Renewed", class: "bg-cyan-100 text-cyan-700" },
  RELEASE_PENDING: { label: "Release Pending", class: "bg-purple-100 text-purple-700" },
  RELEASED: { label: "Released", class: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Cancelled", class: "bg-red-100 text-red-700" },
  ARCHIVED: { label: "Archived", class: "bg-slate-100 text-slate-500" },
};

interface Props {
  deposits: Deposit[];
  total: number;
  page: number;
  limit: number;
  searchParams: Record<string, string | undefined>;
}

export function DepositsTable({ deposits, total, page, limit, searchParams }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const totalPages = Math.ceil(total / limit);

  function buildUrl(newParams: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const merged = { ...searchParams, ...newParams };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) p.set(k, v);
    });
    return `${pathname}?${p.toString()}`;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      {/* Filters */}
      <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search deposits..."
          defaultValue={searchParams.search}
          onChange={(e) => {
            const url = buildUrl({ search: e.target.value || undefined, page: "1" });
            router.push(url);
          }}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
        <select
          defaultValue={searchParams.status ?? ""}
          onChange={(e) => router.push(buildUrl({ status: e.target.value || undefined, page: "1" }))}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING_REVIEW">Pending Review</option>
          <option value="APPROVED">Approved</option>
          <option value="ACTIVE">Active</option>
          <option value="MATURING_SOON">Maturing Soon</option>
          <option value="MATURED">Matured</option>
          <option value="RENEWAL_PENDING">Renewal Pending</option>
          <option value="RELEASE_PENDING">Release Pending</option>
          <option value="RELEASED">Released</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <select
          defaultValue={searchParams.type ?? ""}
          onChange={(e) => router.push(buildUrl({ type: e.target.value || undefined, page: "1" }))}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          <option value="FIXED_DEPOSIT">Fixed Deposit</option>
          <option value="SECURITY_DEPOSIT">Security Deposit</option>
          <option value="BANK_GUARANTEE">Bank Guarantee</option>
          <option value="EARNEST_MONEY">Earnest Money</option>
          <option value="LEASE_DEPOSIT">Lease Deposit</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-100">
              <th className="p-4">Reference</th>
              <th className="p-4">Type</th>
              <th className="p-4">Bank</th>
              <th className="p-4">Beneficiary</th>
              <th className="p-4 text-right">Amount</th>
              <th className="p-4">Maturity</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Docs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {deposits.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-12 text-center text-slate-500">
                  <FileText size={32} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">No deposits found</p>
                </td>
              </tr>
            ) : (
              deposits.map((d) => {
                const badge = STATUS_BADGES[d.status];
                const days = daysUntilMaturity(d.maturityDate);
                const urgency = getMaturityUrgency(d.maturityDate);

                return (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <Link
                        href={`/deposits/${d.id}`}
                        className="font-medium text-blue-600 hover:underline text-sm"
                      >
                        {d.referenceNumber}
                      </Link>
                      {d.certificateNumber && (
                        <p className="text-xs text-slate-400">{d.certificateNumber}</p>
                      )}
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {d.depositType.replace(/_/g, " ")}
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {d.bank?.name ?? "—"}
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {d.beneficiary?.name ?? "—"}
                    </td>
                    <td className="p-4 text-sm text-slate-900 font-medium text-right">
                      {formatCurrency(d.principalAmount, d.currency)}
                    </td>
                    <td className="p-4">
                      {d.maturityDate ? (
                        <div>
                          <p className="text-sm text-slate-700">
                            {format(d.maturityDate, "dd MMM yyyy")}
                          </p>
                          {days !== null && (
                            <p
                              className={`text-xs ${
                                urgency === "overdue"
                                  ? "text-red-600 font-medium"
                                  : urgency === "critical"
                                    ? "text-red-500"
                                    : urgency === "warning"
                                      ? "text-amber-500"
                                      : "text-slate-400"
                              }`}
                            >
                              {urgency === "overdue"
                                ? `${Math.abs(days)}d overdue`
                                : `${days}d remaining`}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badge.class}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-sm text-slate-500">
                        {d._count.documents}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 border-t border-slate-100">
          <p className="text-sm text-slate-500">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of{" "}
            {total.toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={buildUrl({ page: String(page - 1) })}
              className={`p-2 rounded-lg border ${
                page <= 1
                  ? "border-slate-100 text-slate-300 pointer-events-none"
                  : "border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
              aria-disabled={page <= 1}
            >
              <ChevronLeft size={14} />
            </Link>
            <span className="text-sm text-slate-600 px-2">
              {page} / {totalPages}
            </span>
            <Link
              href={buildUrl({ page: String(page + 1) })}
              className={`p-2 rounded-lg border ${
                page >= totalPages
                  ? "border-slate-100 text-slate-300 pointer-events-none"
                  : "border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
              aria-disabled={page >= totalPages}
            >
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
