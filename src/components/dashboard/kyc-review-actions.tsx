"use client";
import { useState } from "react";
import { CheckCircle2, XCircle, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";

interface KycReviewActionsProps {
  kycId: string;
  currentStatus: string;
}

export function KycReviewActions({ kycId, currentStatus }: KycReviewActionsProps) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [showNotesFor, setShowNotesFor] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (currentStatus === "APPROVED" || currentStatus === "REJECTED") {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
        currentStatus === "APPROVED" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}>
        {currentStatus === "APPROVED" ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
        {currentStatus}
      </span>
    );
  }

  async function submit(status: "APPROVED" | "REJECTED") {
    if (status === "REJECTED" && !notes.trim()) {
      setError("Rejection notes are required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/kyc/${kycId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewNotes: notes.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Action failed"); setLoading(false); return; }
      router.refresh();
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  if (showNotesFor) {
    return (
      <div className="flex flex-col gap-2 min-w-[220px]">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={showNotesFor === "REJECTED" ? "Reason for rejection (required)…" : "Optional notes…"}
          rows={2}
          className="border border-slate-300 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => submit(showNotesFor)}
            disabled={loading}
            className={`flex-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              showNotesFor === "APPROVED"
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-red-600 hover:bg-red-700 text-white"
            } disabled:opacity-50`}
          >
            {loading ? "…" : `Confirm ${showNotesFor === "APPROVED" ? "Approval" : "Rejection"}`}
          </button>
          <button
            onClick={() => { setShowNotesFor(null); setNotes(""); setError(""); }}
            className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1.5"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setShowNotesFor("APPROVED")}
        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 transition-colors"
      >
        <CheckCircle2 size={13} /> Approve
      </button>
      <button
        onClick={() => setShowNotesFor("REJECTED")}
        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors"
      >
        <XCircle size={13} /> Reject
      </button>
    </div>
  );
}
