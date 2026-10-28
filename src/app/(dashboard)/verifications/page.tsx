import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { ShieldCheck, Clock, CheckCircle2, XCircle, User, Building2 } from "lucide-react";
import { KycReviewActions } from "@/components/dashboard/kyc-review-actions";
import type { UserRole } from "@prisma/client";

export const metadata: Metadata = { title: "KYC Verifications" };

const DOC_LABELS: Record<string, string> = {
  AADHAAR: "Aadhaar Card",
  PAN_CARD: "PAN Card",
  PASSPORT: "Passport",
  DRIVING_LICENSE: "Driving License",
  VOTER_ID: "Voter ID",
  BANK_STATEMENT: "Bank Statement",
  UTILITY_BILL: "Utility Bill",
  OTHER: "Other Govt. ID",
};

export default async function VerificationsPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const role = (session.user as any)?.role as UserRole;
  if (!hasPermission(role, "kyc:review")) redirect("/dashboard");

  const filter = searchParams.filter ?? "PENDING_REVIEW";
  const where = filter === "all" ? {} : { status: filter as any };

  const [records, counts] = await Promise.all([
    prisma.kycVerification.findMany({
      where,
      orderBy: { submittedAt: "asc" },
      include: {
        user: { select: { id: true, name: true, email: true, department: true } },
        reviewedBy: { select: { name: true } },
      },
    }),
    prisma.kycVerification.groupBy({
      by: ["status"],
      _count: true,
    }),
  ]);

  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count]));
  const pendingCount = countMap["PENDING_REVIEW"] ?? 0;
  const approvedCount = countMap["APPROVED"] ?? 0;
  const rejectedCount = countMap["REJECTED"] ?? 0;

  const filters = [
    { key: "PENDING_REVIEW", label: "Pending", count: pendingCount, icon: Clock, color: "text-amber-600" },
    { key: "APPROVED", label: "Approved", count: approvedCount, icon: CheckCircle2, color: "text-green-600" },
    { key: "REJECTED", label: "Rejected", count: rejectedCount, icon: XCircle, color: "text-red-600" },
    { key: "all", label: "All", count: pendingCount + approvedCount + rejectedCount, icon: ShieldCheck, color: "text-slate-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">KYC Verifications</h1>
        <p className="text-slate-500 text-sm mt-1">Review and approve client identity verification requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {filters.map((f) => (
          <a
            key={f.key}
            href={`/verifications?filter=${f.key}`}
            className={`bg-white rounded-xl border p-4 flex items-center gap-3 hover:border-blue-300 transition-colors ${
              filter === f.key ? "border-blue-500 ring-1 ring-blue-200" : "border-slate-200"
            }`}
          >
            <f.icon size={20} className={f.color} />
            <div>
              <p className="text-xl font-bold text-slate-900">{f.count}</p>
              <p className="text-xs text-slate-500">{f.label}</p>
            </div>
          </a>
        ))}
      </div>

      {/* Records table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">
            {filter === "all" ? "All Submissions" : filters.find(f => f.key === filter)?.label + " Submissions"}
          </h2>
        </div>

        {records.length === 0 ? (
          <div className="py-16 text-center">
            <ShieldCheck size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 text-sm">No {filter === "all" ? "" : filter.replace("_", " ").toLowerCase() + " "}submissions</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {records.map((r) => (
              <div key={r.id} className="p-5 flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-blue-700 font-bold text-sm">
                      {r.user.name?.[0]?.toUpperCase() ?? "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-900">{r.user.name}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          r.status === "PENDING_REVIEW" ? "bg-amber-100 text-amber-700" :
                          r.status === "APPROVED" ? "bg-green-100 text-green-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {r.status === "PENDING_REVIEW" ? "Pending Review" : r.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <User size={10} /> {r.user.email}
                      </p>
                      {r.user.department && (
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <Building2 size={10} /> {r.user.department}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 ml-12 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1">
                    <div>
                      <p className="text-xs text-slate-400">Document Type</p>
                      <p className="text-sm text-slate-700 font-medium">{DOC_LABELS[r.documentType] ?? r.documentType}</p>
                    </div>
                    {r.fullName && (
                      <div>
                        <p className="text-xs text-slate-400">Name on Document</p>
                        <p className="text-sm text-slate-700">{r.fullName}</p>
                      </div>
                    )}
                    {r.documentNumber && (
                      <div>
                        <p className="text-xs text-slate-400">Document Number</p>
                        <p className="text-sm font-mono text-slate-700">{r.documentNumber}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-slate-400">Submitted</p>
                      <p className="text-sm text-slate-700">
                        {r.submittedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    {r.reviewedBy && (
                      <div>
                        <p className="text-xs text-slate-400">Reviewed By</p>
                        <p className="text-sm text-slate-700">{r.reviewedBy.name}</p>
                      </div>
                    )}
                  </div>

                  {r.reviewNotes && (
                    <div className="mt-3 ml-12 bg-slate-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-slate-500">Review Notes</p>
                      <p className="text-sm text-slate-700 mt-0.5">{r.reviewNotes}</p>
                    </div>
                  )}
                </div>

                <div className="sm:ml-4 flex-shrink-0">
                  <KycReviewActions kycId={r.id} currentStatus={r.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
