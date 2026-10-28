export const dynamic = "force-dynamic";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/permissions";
import { OrderTracking } from "@/components/ui/order-tracking";
import { CancelRequestButton } from "@/components/user/cancel-request-button";
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import type { PaymentRequestStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Request Details" };

const STATUS_FLOW: PaymentRequestStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "PROCESSING",
  "COMPLETED",
];

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
  NEW_DEPOSIT: "New Fixed Deposit",
  RENEWAL: "Renewal",
  RELEASE: "Release / Closure",
  PAYMENT_QUERY: "Payment Query",
  OTHER: "Other",
};

const stepDescriptions: Record<PaymentRequestStatus, string> = {
  SUBMITTED: "Your request has been received and is in our queue",
  UNDER_REVIEW: "Our team is reviewing the details of your request",
  APPROVED: "Your request has been approved",
  PROCESSING: "We are processing your request",
  COMPLETED: "Your request has been completed successfully",
  REJECTED: "Your request was not approved",
  CANCELLED: "Request was cancelled",
};

export default async function RequestDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { submitted?: string };
}) {
  const session = await getSession();
  const userId = getUserId(session!)!;

  const request = await prisma.paymentRequest.findUnique({
    where: { id: params.id },
    include: {
      statusHistory: { orderBy: { createdAt: "asc" } },
      reviewedBy: { select: { name: true } },
    },
  });

  if (!request) notFound();
  if (request.clientId !== userId) redirect("/portal/requests");

  const isRejected = request.status === "REJECTED";
  const isCancelled = request.status === "CANCELLED";
  const isTerminal = ["COMPLETED", "REJECTED", "CANCELLED"].includes(request.status);

  // Build tracking steps
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
        ? new Date(historyEntry.createdAt).toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : currentStatusIdx < stepIdx
        ? "Pending"
        : "—",
      isCompleted: isCompleted || isTerminalCompleted,
      isCurrent,
      description: historyEntry?.notes ?? (isCurrent ? stepDescriptions[stepStatus as PaymentRequestStatus] : undefined),
    };
  });

  return (
    <div className="max-w-4xl space-y-6">
      {searchParams.submitted === "1" && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />
          <div>
            <p className="text-green-800 font-medium text-sm">Request submitted successfully!</p>
            <p className="text-green-600 text-xs mt-0.5">Our team will review it shortly.</p>
          </div>
        </div>
      )}

      <div>
        <Link href="/portal/requests" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors">
          <ArrowLeft size={14} /> Back to requests
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{request.requestNumber}</h1>
            <p className="text-slate-500 text-sm mt-1">
              {typeLabels[request.type]} · Submitted {new Date(request.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${statusColors[request.status]}`}>
            {statusLabels[request.status]}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Tracking */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-6">Request Progress</h2>
          <OrderTracking steps={steps} />

          {isRejected && request.reviewNotes && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
              <XCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium text-sm">Rejection reason</p>
                <p className="text-red-600 text-sm mt-1">{request.reviewNotes}</p>
              </div>
            </div>
          )}

          {isCancelled && (
            <div className="mt-6 bg-slate-50 border border-slate-200 rounded-lg p-4 flex gap-3">
              <AlertCircle size={18} className="text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-500 text-sm">This request was cancelled.</p>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 text-sm mb-4">Request details</h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-slate-500 text-xs">Type</dt>
                <dd className="text-slate-900 font-medium mt-0.5">{typeLabels[request.type]}</dd>
              </div>
              {request.amount && (
                <div>
                  <dt className="text-slate-500 text-xs">Amount</dt>
                  <dd className="text-slate-900 font-medium mt-0.5">
                    {request.currency} {request.amount.toLocaleString("en-IN")}
                  </dd>
                </div>
              )}
              {request.bankName && (
                <div>
                  <dt className="text-slate-500 text-xs">Bank</dt>
                  <dd className="text-slate-900 mt-0.5">{request.bankName}</dd>
                </div>
              )}
              {request.accountNumber && (
                <div>
                  <dt className="text-slate-500 text-xs">Account / FD No.</dt>
                  <dd className="text-slate-900 mt-0.5 font-mono text-xs">{request.accountNumber}</dd>
                </div>
              )}
              <div>
                <dt className="text-slate-500 text-xs">Priority</dt>
                <dd className="text-slate-900 mt-0.5">{request.urgency}</dd>
              </div>
              {request.reviewedBy && (
                <div>
                  <dt className="text-slate-500 text-xs">Reviewed by</dt>
                  <dd className="text-slate-900 mt-0.5">{request.reviewedBy.name}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 text-sm mb-3">Description</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{request.description}</p>
          </div>

          {["SUBMITTED", "UNDER_REVIEW"].includes(request.status) && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 text-sm mb-2">Actions</h3>
              <CancelRequestButton requestId={request.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

