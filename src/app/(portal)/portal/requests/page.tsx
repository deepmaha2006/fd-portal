export const dynamic = "force-dynamic";
import { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/permissions";
import { PlusCircle, ClipboardList } from "lucide-react";

export const metadata: Metadata = { title: "My Requests" };

const statusColors: Record<string, string> = {
  SUBMITTED: "bg-blue-100 text-blue-700",
  UNDER_REVIEW: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  PROCESSING: "bg-purple-100 text-purple-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-slate-100 text-slate-500",
};

const typeLabels: Record<string, string> = {
  NEW_DEPOSIT: "New Deposit",
  RENEWAL: "Renewal",
  RELEASE: "Release",
  PAYMENT_QUERY: "Payment Query",
  OTHER: "Other",
};

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const session = await getSession();
  const userId = getUserId(session!)!;
  const page = Number(searchParams.page ?? 1);
  const limit = 20;

  const where: Record<string, unknown> = { clientId: userId };
  if (searchParams.status) where.status = searchParams.status;

  const [requests, total] = await prisma.$transaction([
    prisma.paymentRequest.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.paymentRequest.count({ where }),
  ]);

  const statusTabs = [
    { label: "All", value: "" },
    { label: "In Progress", value: "SUBMITTED" },
    { label: "Under Review", value: "UNDER_REVIEW" },
    { label: "Approved", value: "APPROVED" },
    { label: "Completed", value: "COMPLETED" },
    { label: "Rejected", value: "REJECTED" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Requests</h1>
          <p className="text-slate-500 text-sm mt-1">{total} request{total !== 1 ? "s" : ""} total</p>
        </div>
        <Link
          href="/portal/requests/new"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <PlusCircle size={15} /> New Request
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {statusTabs.map((tab) => {
          const isActive = (searchParams.status ?? "") === tab.value;
          const href = tab.value ? `/portal/requests?status=${tab.value}` : "/portal/requests";
          return (
            <Link
              key={tab.value}
              href={href}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                isActive
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Requests list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {requests.length === 0 ? (
          <div className="py-16 text-center">
            <ClipboardList size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No requests found.</p>
            <Link href="/portal/requests/new" className="inline-block mt-4 text-sm text-blue-600 hover:underline">
              Submit a request →
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Request</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <Link href={`/portal/requests/${r.id}`} className="text-blue-600 hover:underline font-medium">
                          {r.requestNumber}
                        </Link>
                        <p className="text-xs text-slate-500 mt-0.5 max-w-xs truncate">{r.description}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-700">{typeLabels[r.type]}</td>
                      <td className="px-5 py-4 text-slate-700">
                        {r.amount ? `${r.currency} ${r.amount.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {new Date(r.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[r.status]}`}>
                          {r.status.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > limit && (
              <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
                <span>Page {page} of {Math.ceil(total / limit)}</span>
                <div className="flex gap-2">
                  {page > 1 && (
                    <Link href={`/portal/requests?page=${page - 1}${searchParams.status ? `&status=${searchParams.status}` : ""}`}
                      className="px-3 py-1 border rounded hover:bg-slate-50">← Prev</Link>
                  )}
                  {page < Math.ceil(total / limit) && (
                    <Link href={`/portal/requests?page=${page + 1}${searchParams.status ? `&status=${searchParams.status}` : ""}`}
                      className="px-3 py-1 border rounded hover:bg-slate-50">Next →</Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
