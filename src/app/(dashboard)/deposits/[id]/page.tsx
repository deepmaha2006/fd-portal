import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import Link from "next/link";
import { format } from "date-fns";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { formatCurrency, getMaturityUrgency, daysUntilMaturity } from "@/lib/deposit-utils";
import { DepositStatusBadge } from "@/components/deposits/deposit-status-badge";
import { DepositActions } from "@/components/deposits/deposit-actions";
import { DocumentsList } from "@/components/deposits/documents-list";
import { LifecycleTimeline } from "@/components/deposits/lifecycle-timeline";
import { ArrowLeft, Edit, FileText } from "lucide-react";
import type { UserRole } from "@prisma/client";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const deposit = await prisma.deposit.findUnique({
    where: { id: params.id },
    select: { referenceNumber: true },
  });
  return { title: deposit?.referenceNumber ?? "Deposit" };
}

export default async function DepositDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userRole = (session.user as any)?.role as UserRole;
  const userId = (session.user as any)?.id as string;

  const deposit = await prisma.deposit.findUnique({
    where: { id: params.id },
    include: {
      bank: true,
      branch: true,
      beneficiary: true,
      department: true,
      owner: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      documents: {
        where: { isArchived: false },
        orderBy: { uploadedAt: "desc" },
      },
      lifecycleEvents: {
        orderBy: { occurredAt: "asc" },
      },
    },
  });

  if (!deposit) notFound();

  const canEdit = hasPermission(userRole, "deposit:update");
  const canUpload = hasPermission(userRole, "document:upload");
  const canDownload = hasPermission(userRole, "document:download");
  const canChangeStatus = hasPermission(userRole, "deposit:submit");

  const days = daysUntilMaturity(deposit.maturityDate);
  const urgency = getMaturityUrgency(deposit.maturityDate);

  // Mask account number
  const maskedAccount = deposit.accountNumber
    ? "****" + deposit.accountNumber.slice(-4)
    : null;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/deposits"
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-2"
          >
            <ArrowLeft size={14} /> Back to deposits
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {deposit.referenceNumber}
            </h1>
            <DepositStatusBadge status={deposit.status} />
          </div>
          {deposit.certificateNumber && (
            <p className="text-slate-500 text-sm mt-1">
              Certificate: {deposit.certificateNumber}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {canEdit && !["RELEASED", "CANCELLED", "ARCHIVED", "RENEWED"].includes(deposit.status) && (
            <Link
              href={`/deposits/${deposit.id}/edit`}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
            >
              <Edit size={14} /> Edit
            </Link>
          )}
          {canChangeStatus && (
            <DepositActions
              deposit={{
                id: deposit.id,
                status: deposit.status,
                createdById: deposit.createdById,
              }}
              currentUserId={userId}
              userRole={userRole}
            />
          )}
        </div>
      </div>

      {/* Maturity alert */}
      {(urgency === "overdue" || urgency === "critical" || urgency === "warning") && (
        <div
          className={`rounded-lg p-4 ${
            urgency === "overdue"
              ? "bg-red-50 border border-red-200"
              : urgency === "critical"
                ? "bg-red-50 border border-red-200"
                : "bg-amber-50 border border-amber-200"
          }`}
        >
          <p
            className={`text-sm font-medium ${
              urgency === "overdue" || urgency === "critical"
                ? "text-red-700"
                : "text-amber-700"
            }`}
          >
            {urgency === "overdue"
              ? `⚠️ This deposit matured ${Math.abs(days!)} day(s) ago and requires immediate action`
              : `⏰ This deposit matures in ${days} day(s)`}
          </p>
        </div>
      )}

      {/* Main details grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deposit Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Deposit Details</h2>
          <dl className="space-y-3">
            <DetailRow label="Type" value={deposit.depositType.replace(/_/g, " ")} />
            <DetailRow label="Bank" value={deposit.bank?.name} />
            <DetailRow label="Branch" value={deposit.branch?.name} />
            {maskedAccount && <DetailRow label="Account No." value={maskedAccount} />}
            <DetailRow
              label="Principal Amount"
              value={formatCurrency(deposit.principalAmount, deposit.currency)}
              highlight
            />
            {deposit.interestRate !== null && (
              <DetailRow
                label="Interest Rate"
                value={`${Number(deposit.interestRate).toFixed(2)}% p.a.`}
              />
            )}
            {deposit.maturityAmount && (
              <DetailRow
                label="Maturity Amount"
                value={formatCurrency(deposit.maturityAmount, deposit.currency)}
              />
            )}
          </dl>
        </div>

        {/* Dates & Parties */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Dates & Parties</h2>
          <dl className="space-y-3">
            <DetailRow
              label="Issue Date"
              value={format(deposit.issueDate, "dd MMM yyyy")}
            />
            {deposit.maturityDate && (
              <DetailRow
                label="Maturity Date"
                value={format(deposit.maturityDate, "dd MMM yyyy")}
                highlight={urgency !== "ok" && urgency !== "na"}
              />
            )}
            {deposit.expiryDate && (
              <DetailRow
                label="Expiry Date"
                value={format(deposit.expiryDate, "dd MMM yyyy")}
              />
            )}
            <DetailRow label="Beneficiary" value={deposit.beneficiary?.name} />
            <DetailRow label="Issuing Org" value={deposit.issuingOrganization} />
            <DetailRow label="Contract No." value={deposit.contractNumber} />
            <DetailRow label="Vendor Ref." value={deposit.vendorReference} />
            <DetailRow label="Department" value={deposit.department?.name} />
            <DetailRow label="Owner" value={deposit.owner?.name} />
          </dl>
        </div>
      </div>

      {/* Notes */}
      {deposit.notes && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-2">Notes</h2>
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{deposit.notes}</p>
        </div>
      )}

      {/* Documents */}
      <DocumentsList
        depositId={deposit.id}
        documents={deposit.documents}
        canUpload={canUpload}
        canDownload={canDownload}
      />

      {/* Lifecycle */}
      <LifecycleTimeline events={deposit.lifecycleEvents} />

      {/* Audit meta */}
      <div className="text-xs text-slate-400 flex gap-6">
        <span>
          Created {format(deposit.createdAt, "dd MMM yyyy HH:mm")}
          {deposit.createdBy ? ` by ${deposit.createdBy.name}` : ""}
        </span>
        {deposit.approvedBy && deposit.approvedAt && (
          <span>
            Approved {format(deposit.approvedAt, "dd MMM yyyy")} by {deposit.approvedBy.name}
          </span>
        )}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value?: string | null;
  highlight?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-sm text-slate-500 flex-shrink-0">{label}</dt>
      <dd
        className={`text-sm text-right truncate ${
          highlight ? "font-semibold text-slate-900" : "text-slate-700"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
