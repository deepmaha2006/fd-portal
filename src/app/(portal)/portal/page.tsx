export const dynamic = "force-dynamic";
import { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/permissions";
import { PlusCircle, ClipboardList, CheckCircle2, Clock, XCircle, ArrowRight } from "lucide-react";

export const metadata: Metadata = { title: "My Portal" };

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

export default async function PortalPage() {
  const session = await getSession();
  const userId = getUserId(session!)!;

  const [recentRequests, counts] = await Promise.all([
    prisma.paymentRequest.findMany({
      where: { clientId: userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }).catch(() => []),
    prisma.paymentRequest.groupBy({
      by: ["status"],
      where: { clientId: userId },
      _count: true,
    }).catch(() => []),
  ]);

  const total = counts.reduce((s, c) => s + c._count, 0);
  const pending = counts.filter((c) => ["SUBMITTED", "UNDER_REVIEW", "PROCESSING"].includes(c.status))
    .reduce((s, c) => s + c._count, 0);
  const completed = counts.find((c) => c.status === "COMPLETED")?._count ?? 0;
  const approved = counts.find((c) => c.status === "APPROVED")?._count ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {session?.user?.name?.split(" ")[0]}
        </h1>
        <p className="text-slate-500 text-sm mt-1">Here&apos;s an overview of your deposit requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Requests", value: total, icon: ClipboardList, color: "text-blue-600" },
          { label: "In Progress", value: pending, icon: Clock, color: "text-amber-600" },
          { label: "Approved", value: approved, icon: CheckCircle2, color: "text-green-600" },
          { label: "Completed", value: completed, icon: CheckCircle2, color: "text-emerald-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-5">
            <stat.icon size={20} className={`${stat.color} mb-3`} />
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-sm text-slate-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          href="/portal/requests/new"
          className="group bg-blue-600 hover:bg-blue-700 rounded-xl p-6 flex items-center justify-between transition-colors"
        >
          <div>
            <p className="text-white font-semibold">Submit a new request</p>
            <p className="text-blue-200 text-sm mt-1">New deposit, renewal, or release</p>
          </div>
          <div className="bg-blue-500 rounded-lg p-3 group-hover:bg-blue-400 transition-colors">
            <PlusCircle size={20} className="text-white" />
          </div>
        </Link>
        <Link
          href="/portal/requests"
          className="group bg-white hover:bg-slate-50 rounded-xl border border-slate-200 p-6 flex items-center justify-between transition-colors"
        >
          <div>
            <p className="text-slate-900 font-semibold">View all requests</p>
            <p className="text-slate-500 text-sm mt-1">Track status and history</p>
          </div>
          <div className="bg-slate-100 rounded-lg p-3 group-hover:bg-slate-200 transition-colors">
            <ClipboardList size={20} className="text-slate-600" />
          </div>
        </Link>
      </div>

      {/* Recent requests */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Recent requests</h2>
          <Link href="/portal/requests" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {recentRequests.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <ClipboardList size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No requests yet.</p>
            <Link href="/portal/requests/new" className="inline-block mt-4 text-sm text-blue-600 hover:underline">
              Submit your first request →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentRequests.map((r) => (
              <Link key={r.id} href={`/portal/requests/${r.id}`} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-slate-900">{r.requestNumber}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{typeLabels[r.type]} · {new Date(r.createdAt).toLocaleDateString("en-IN")}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[r.status]}`}>
                  {r.status.replace(/_/g, " ")}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
