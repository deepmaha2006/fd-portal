"use client";
import { useState } from "react";
import { ShieldCheck, Clock, XCircle, CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";

const DOC_TYPES = [
  { value: "AADHAAR", label: "Aadhaar Card" },
  { value: "PAN_CARD", label: "PAN Card" },
  { value: "PASSPORT", label: "Passport" },
  { value: "DRIVING_LICENSE", label: "Driving License" },
  { value: "VOTER_ID", label: "Voter ID" },
  { value: "BANK_STATEMENT", label: "Bank Statement (last 3 months)" },
  { value: "UTILITY_BILL", label: "Utility Bill" },
  { value: "OTHER", label: "Other Government ID" },
];

interface KycRecord {
  id: string;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  documentType: string;
  fullName: string;
  documentNumber?: string | null;
  submittedAt: string;
  reviewNotes?: string | null;
  reviewedBy?: { name: string } | null;
  reviewedAt?: string | null;
}

interface KycFormProps {
  existing: KycRecord | null;
}

export function KycForm({ existing }: KycFormProps) {
  const [documentType, setDocumentType] = useState(existing?.documentType ?? "AADHAAR");
  const [fullName, setFullName] = useState(existing?.fullName ?? "");
  const [documentNumber, setDocumentNumber] = useState(existing?.documentNumber ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [currentKyc, setCurrentKyc] = useState<KycRecord | null>(existing);

  const canResubmit = !currentKyc || currentKyc.status === "REJECTED";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) { setError("Full name is required"); return; }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentType, fullName: fullName.trim(), documentNumber: documentNumber.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Submission failed"); return; }
      setSuccess(true);
      setCurrentKyc({ ...currentKyc, status: "PENDING_REVIEW", documentType, fullName, documentNumber, submittedAt: new Date().toISOString() } as KycRecord);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success || (currentKyc?.status === "PENDING_REVIEW" && !canResubmit)) {
    return (
      <div className="flex flex-col items-center py-8 text-center gap-3">
        <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
          <Clock size={24} className="text-amber-600" />
        </div>
        <h3 className="font-semibold text-slate-900">Verification Submitted</h3>
        <p className="text-sm text-slate-500 max-w-sm">
          Your documents have been submitted and are under review. You'll be notified once an admin has reviewed your submission.
        </p>
        {currentKyc && (
          <div className="mt-3 bg-slate-50 rounded-lg px-4 py-3 text-left w-full max-w-xs">
            <p className="text-xs text-slate-500">Document type</p>
            <p className="text-sm font-medium text-slate-800">{DOC_TYPES.find(d => d.value === currentKyc.documentType)?.label ?? currentKyc.documentType}</p>
            <p className="text-xs text-slate-500 mt-2">Submitted</p>
            <p className="text-sm text-slate-800">{new Date(currentKyc.submittedAt).toLocaleDateString("en-IN")}</p>
          </div>
        )}
      </div>
    );
  }

  if (currentKyc?.status === "APPROVED") {
    return (
      <div className="flex flex-col items-center py-8 text-center gap-3">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 size={24} className="text-green-600" />
        </div>
        <h3 className="font-semibold text-slate-900">Identity Verified</h3>
        <p className="text-sm text-slate-500 max-w-sm">
          Your identity has been verified. You can now submit payment requests.
        </p>
        {currentKyc.reviewedAt && (
          <p className="text-xs text-slate-400">
            Verified on {new Date(currentKyc.reviewedAt).toLocaleDateString("en-IN")}
            {currentKyc.reviewedBy && ` by ${currentKyc.reviewedBy.name}`}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {currentKyc?.status === "REJECTED" && (
        <div className="flex gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
          <XCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Verification rejected</p>
            {currentKyc.reviewNotes && (
              <p className="text-sm text-red-700 mt-0.5">{currentKyc.reviewNotes}</p>
            )}
            <p className="text-xs text-red-600 mt-1">Please resubmit with correct information.</p>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Government ID Type <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="w-full appearance-none border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {DOC_TYPES.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Full Name (as on document) <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="e.g. RAHUL KUMAR SHARMA"
          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Document / ID Number <span className="text-slate-400 text-xs font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={documentNumber}
          onChange={(e) => setDocumentNumber(e.target.value)}
          placeholder="e.g. XXXX XXXX 1234"
          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-slate-400 mt-1">Your document number is stored securely and used only for identity verification.</p>
      </div>

      {error && (
        <div className="flex gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium text-sm py-2.5 rounded-lg transition-colors"
      >
        <ShieldCheck size={16} />
        {loading ? "Submitting…" : "Submit for Verification"}
      </button>
    </form>
  );
}
