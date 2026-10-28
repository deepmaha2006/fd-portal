export const dynamic = "force-dynamic";
import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";
import { AdminRequestActions } from "@/components/admin/request-actions";
import { InboxIcon } from "lucide-react";

export const metadata: Metadata = { title: "Client Requests" };

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

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const userRole = (session.user as any)?.role as UserRole;
  if (!hasPermission(userRole, "payment_request:view_all")) redirect("/dashboard");

  const page = Number(searchParams.page ?? 1);
  const limit = 20;
  const where: Record<string, unknown> = {};
  if (searchParams.status) where.status = searchParams.status;

  const [requests, total, pendingCount] = await prisma.$transaction([
    prisma.paymentRequest.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { name: true, email: true, department: true } },
        reviewedBy: { select: { name: true } },
      },
    }),
    prisma.paymentRequest.count({ where }),
    prisma.paymentRequest.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
  ]);

  const statusTabs = [
    { label: "All", value: "" },
    { label: `Pending (${pendingCount})`, value: "SUBMITTED" },
    { label: "Under Review", value: "UNDER_REVIEW" },
    { label: "Approved", value: "APPROVED" },
    { label: "Completed", value: "COMPLETED" },
    { label: "Rejected", value: "REJECTED" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Client Requests</h1>
        <p className="text-slate-500 text-sm mt-1">
          Review and manage payment requests from clients — {total} total
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {statusTabs.map((tab) => {
          const isActive = (searchParams.status ?? "") === tab.value;
          const href = tab.value ? `/admin/requests?status=${tab.value}` : "/admin/requests";
          return (
            <Link key={tab.value} href={href}
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

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {requests.length === 0 ? (
          <div className="py-16 text-center">
            <InboxIcon size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No requests found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Request</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">{r.client.name}</p>
                      <p className="text-xs text-slate-500">{r.client.department ?? r.client.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <Link href={`/admin/requests/${r.id}`} className="text-blue-600 hover:underline font-medium">
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
                    <td className="px-5 py-4">
                      <AdminRequestActions requestId={r.id} currentStatus={r.status} userRole={userRole} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
