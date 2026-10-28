export const dynamic = "force-dynamic";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { OrderTracking } from "@/components/ui/order-tracking";
import { AdminRequestActions } from "@/components/admin/request-actions";
import { ArrowLeft, PlusCircle } from "lucide-react";
import type { UserRole, PaymentRequestStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Request Detail" };

const STATUS_FLOW: PaymentRequestStatus[] = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "PROCESSING", "COMPLETED"];
const statusLabels: Record<string, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};
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
  NEW_DEPOSIT: "New Fixed Deposit", RENEWAL: "Renewal", RELEASE: "Release / Closure",
  PAYMENT_QUERY: "Payment Query", OTHER: "Other",
};

export default async function AdminRequestDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const role = (session.user as any)?.role as UserRole;
  if (!hasPermission(role, "payment_request:view_all")) redirect("/dashboard");

  const request = await prisma.paymentRequest.findUnique({
    where: { id: params.id },
    include: {
      client: { select: { name: true, email: true, department: true } },
      reviewedBy: { select: { name: true } },
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!request) notFound();

  const isRejected = request.status === "REJECTED";
  const isCancelled = request.status === "CANCELLED";
  const isTerminal = ["COMPLETED", "REJECTED", "CANCELLED"].includes(request.status);
  const flowToUse = isRejected || isCancelled ? ["SUBMITTED", "UNDER_REVIEW", request.status] : STATUS_FLOW;

  const steps = flowToUse.map((stepStatus) => {
    const historyEntry = request.statusHistory.find((h) => h.status === stepStatus);
    const currentStatusIdx = STATUS_FLOW.indexOf(request.status as PaymentRequestStatus);
    const stepIdx = STATUS_FLOW.indexOf(stepStatus as PaymentRequestStatus);
    const isCompleted = historyEntry != null && stepStatus !== request.status;
    const isCurrent = stepStatus === request.status && !isTerminal;
    const isTerminalCompleted = stepStatus === request.status && isTerminal;
    return {
      name: statusLabels[stepStatus],
      timestamp: historyEntry
        ? new Date(historyEntry.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
        : currentStatusIdx < stepIdx ? "Pending" : "—",
      isCompleted: isCompleted || isTerminalCompleted,
      isCurrent,
      description: historyEntry?.notes ?? undefined,
    };
  });

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/admin/requests" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors">
          <ArrowLeft size={14} /> Back to requests
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{request.requestNumber}</h1>
            <p className="text-slate-500 text-sm mt-1">
              {typeLabels[request.type]} · From {request.client.name} · {new Date(request.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${statusColors[request.status]}`}>
              {statusLabels[request.status]}
            </span>
            {request.type === "NEW_DEPOSIT" && (
              <Link
                href={`/deposits/new?amount=${request.amount ?? ""}&currency=${request.currency}&notes=${encodeURIComponent(`From client request ${request.requestNumber}: ${request.description.slice(0, 200)}`)}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <PlusCircle size={13} /> Create Deposit
              </Link>
            )}
            {!isTerminal && <AdminRequestActions requestId={request.id} currentStatus={request.status} userRole={role} />}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-6">Request Timeline</h2>
          <OrderTracking steps={steps} />
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 text-sm mb-4">Client</h3>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-xs text-slate-500">Name</dt><dd className="text-slate-900 font-medium mt-0.5">{request.client.name}</dd></div>
              <div><dt className="text-xs text-slate-500">Email</dt><dd className="text-slate-600 mt-0.5">{request.client.email}</dd></div>
              {request.client.department && (
                <div><dt className="text-xs text-slate-500">Organization</dt><dd className="text-slate-900 mt-0.5">{request.client.department}</dd></div>
              )}
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 text-sm mb-4">Request details</h3>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-xs text-slate-500">Type</dt><dd className="text-slate-900 font-medium mt-0.5">{typeLabels[request.type]}</dd></div>
              {request.amount && <div><dt className="text-xs text-slate-500">Amount</dt><dd className="text-slate-900 font-medium mt-0.5">{request.currency} {request.amount.toLocaleString("en-IN")}</dd></div>}
              {(request as any).durationMonths && (
                <div>
                  <dt className="text-xs text-slate-500">FD Duration</dt>
                  <dd className="text-slate-900 font-medium mt-0.5">
                    {(request as any).durationMonths} months
                    {(request as any).durationMonths >= 12 ? ` (${((request as any).durationMonths / 12).toFixed(1).replace(/\.0$/, "")} yr${(request as any).durationMonths >= 24 ? "s" : ""})` : ""}
                  </dd>
                </div>
              )}
              {request.bankName && <div><dt className="text-xs text-slate-500">Bank</dt><dd className="text-slate-900 mt-0.5">{request.bankName}</dd></div>}
              {request.accountNumber && <div><dt className="text-xs text-slate-500">Account / FD No.</dt><dd className="text-slate-900 mt-0.5 font-mono text-xs">{request.accountNumber}</dd></div>}
              <div><dt className="text-xs text-slate-500">Priority</dt><dd className="text-slate-900 mt-0.5">{request.urgency}</dd></div>
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 text-sm mb-3">Description</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{request.description}</p>
          </div>

          {request.reviewNotes && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 text-sm mb-3">Review notes</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{request.reviewNotes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
