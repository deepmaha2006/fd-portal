import type { DepositStatus } from "@prisma/client";

const BADGES: Record<DepositStatus, { label: string; class: string }> = {
  DRAFT: { label: "Draft", class: "bg-slate-100 text-slate-600 border-slate-200" },
  PENDING_REVIEW: { label: "Pending Review", class: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  APPROVED: { label: "Approved", class: "bg-blue-100 text-blue-700 border-blue-200" },
  ACTIVE: { label: "Active", class: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  MATURING_SOON: { label: "Maturing Soon", class: "bg-amber-100 text-amber-700 border-amber-200" },
  MATURED: { label: "Matured", class: "bg-orange-100 text-orange-700 border-orange-200" },
  RENEWAL_PENDING: { label: "Renewal Pending", class: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  RENEWED: { label: "Renewed", class: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  RELEASE_PENDING: { label: "Release Pending", class: "bg-purple-100 text-purple-700 border-purple-200" },
  RELEASED: { label: "Released", class: "bg-green-100 text-green-700 border-green-200" },
  CANCELLED: { label: "Cancelled", class: "bg-red-100 text-red-700 border-red-200" },
  ARCHIVED: { label: "Archived", class: "bg-slate-100 text-slate-500 border-slate-200" },
};

export function DepositStatusBadge({ status }: { status: DepositStatus }) {
  const badge = BADGES[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.class}`}>
      {badge.label}
    </span>
  );
}
