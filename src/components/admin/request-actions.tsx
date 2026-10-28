"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle, XCircle, Eye, PlayCircle } from "lucide-react";

interface AdminRequestActionsProps {
  requestId: string;
  currentStatus: string;
}

export function AdminRequestActions({ requestId, currentStatus }: AdminRequestActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const updateStatus = async (status: string, notesOverride?: string) => {
    setLoading(status);
    try {
      await fetch(`/api/payment-requests/${requestId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes: (notesOverride ?? notes) || undefined }),
      });
      setShowNotes(null);
      setNotes("");
      router.refresh();
    } finally {
      setLoading(null);
    }
  };

  if (["COMPLETED", "CANCELLED"].includes(currentStatus)) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  if (showNotes) {
    return (
      <div className="flex flex-col gap-2 min-w-[200px]">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Add a note (optional)"
          className="text-xs border border-slate-300 rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <div className="flex gap-1.5">
          <button
            onClick={() => updateStatus(showNotes)}
            disabled={!!loading}
            className={`flex-1 flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded text-white font-medium transition-colors ${
              showNotes === "REJECTED" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
            } disabled:opacity-60`}
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : null}
            Confirm
          </button>
          <button onClick={() => { setShowNotes(null); setNotes(""); }}
            className="text-xs px-2 py-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {currentStatus === "SUBMITTED" && (
        <button
          onClick={() => updateStatus("UNDER_REVIEW")}
          disabled={!!loading}
          title="Mark Under Review"
          className="p-1.5 rounded hover:bg-amber-50 text-amber-600 hover:text-amber-700 transition-colors disabled:opacity-60"
        >
          {loading === "UNDER_REVIEW" ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
        </button>
      )}
      {["SUBMITTED", "UNDER_REVIEW"].includes(currentStatus) && (
        <>
          <button
            onClick={() => setShowNotes("APPROVED")}
            title="Approve"
            className="p-1.5 rounded hover:bg-green-50 text-green-600 hover:text-green-700 transition-colors"
          >
            <CheckCircle size={14} />
          </button>
          <button
            onClick={() => setShowNotes("REJECTED")}
            title="Reject"
            className="p-1.5 rounded hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors"
          >
            <XCircle size={14} />
          </button>
        </>
      )}
      {currentStatus === "APPROVED" && (
        <button
          onClick={() => updateStatus("PROCESSING")}
          disabled={!!loading}
          title="Start Processing"
          className="p-1.5 rounded hover:bg-purple-50 text-purple-600 hover:text-purple-700 transition-colors disabled:opacity-60"
        >
          {loading === "PROCESSING" ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={14} />}
        </button>
      )}
      {currentStatus === "PROCESSING" && (
        <button
          onClick={() => updateStatus("COMPLETED")}
          disabled={!!loading}
          title="Mark Completed"
          className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 transition-colors disabled:opacity-60"
        >
          {loading === "COMPLETED" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
        </button>
      )}
    </div>
  );
}
