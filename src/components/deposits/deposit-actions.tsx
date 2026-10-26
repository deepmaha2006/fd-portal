"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";
import type { DepositStatus, UserRole } from "@prisma/client";
import { isValidTransition } from "@/lib/deposit-utils";
import { hasPermission } from "@/lib/permissions";

const ACTION_LABELS: Partial<Record<DepositStatus, string>> = {
  PENDING_REVIEW: "Submit for Review",
  APPROVED: "Approve",
  ACTIVE: "Mark Active",
  RELEASE_PENDING: "Request Release",
  RELEASED: "Release",
  RENEWAL_PENDING: "Request Renewal",
  CANCELLED: "Cancel",
  ARCHIVED: "Archive",
};

interface Props {
  deposit: {
    id: string;
    status: DepositStatus;
    createdById: string | null;
  };
  currentUserId: string;
  userRole: UserRole;
}

export function DepositActions({ deposit, currentUserId, userRole }: Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [notes, setNotes] = useState("");
  const [pendingStatus, setPendingStatus] = useState<DepositStatus | null>(null);

  const allStatuses: DepositStatus[] = [
    "PENDING_REVIEW", "APPROVED", "ACTIVE", "RELEASE_PENDING",
    "RELEASED", "RENEWAL_PENDING", "RENEWED", "CANCELLED", "ARCHIVED",
  ];

  const availableActions = allStatuses.filter((s) => {
    if (!isValidTransition(deposit.status, s)) return false;
    // Separation of duties: creator cannot approve
    if (s === "APPROVED" && deposit.createdById === currentUserId) return false;
    // Check permission
    if (s === "APPROVED" && !hasPermission(userRole, "deposit:approve")) return false;
    if (s === "RELEASED" && !hasPermission(userRole, "deposit:approve")) return false;
    return true;
  });

  if (availableActions.length === 0) return null;

  async function performTransition(status: DepositStatus) {
    setIsLoading(true);
    setShowMenu(false);
    try {
      const res = await fetch(`/api/deposits/${deposit.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes: notes || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Failed to update status");
        return;
      }

      router.refresh();
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setIsLoading(false);
      setPendingStatus(null);
      setNotes("");
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm transition-colors"
      >
        {isLoading ? <Loader2 size={14} className="animate-spin" /> : null}
        Actions
        <ChevronDown size={14} />
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg border border-slate-200 shadow-lg z-50 py-1">
          {availableActions.map((status) => (
            <button
              key={status}
              onClick={() => {
                setPendingStatus(status);
                setShowMenu(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              {ACTION_LABELS[status] ?? status.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      )}

      {/* Confirmation dialog */}
      {pendingStatus && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
            <h3 className="font-semibold text-slate-900 mb-2">
              Confirm: {ACTION_LABELS[pendingStatus] ?? pendingStatus.replace(/_/g, " ")}
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              This will change the deposit status to{" "}
              <strong>{pendingStatus.replace(/_/g, " ")}</strong>.
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes (optional)"
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              maxLength={2000}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPendingStatus(null)}
                className="px-4 py-2 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => performTransition(pendingStatus)}
                disabled={isLoading}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
