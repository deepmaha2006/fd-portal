"use client";
import { useState } from "react";
import { ShieldCheck, Clock, XCircle, CheckCircle2, AlertCircle, ChevronDown, Info } from "lucide-react";

const DOC_TYPES = [
  { value: "AADHAAR",         label: "Aadhaar Card" },
  { value: "PAN_CARD",        label: "PAN Card" },
  { value: "PASSPORT",        label: "Passport" },
  { value: "DRIVING_LICENSE", label: "Driving License" },
  { value: "VOTER_ID",        label: "Voter ID" },
  { value: "BANK_STATEMENT",  label: "Bank Statement (last 3 months)" },
  { value: "UTILITY_BILL",    label: "Utility Bill" },
  { value: "OTHER",           label: "Other Government ID" },
];

type DocRule = {
  label: string;
  hint: string;
  placeholder: string;
  required: boolean;
  maxLength: number;
  inputMode: "numeric" | "text";
  validate: (v: string) => string | null;
  filter: (v: string) => string; // strip disallowed chars on input
};

// Strict per-type rules
const DOC_RULES: Record<string, DocRule> = {
  AADHAAR: {
    label: "Aadhaar Number",
    hint: "12 digits, numbers only (e.g. 9876 5432 1098)",
    placeholder: "XXXX XXXX XXXX",
    required: true,
    maxLength: 14,
    inputMode: "numeric",
    filter: (v) => {
      // keep only digits + spaces, auto-format as XXXX XXXX XXXX
      const digits = v.replace(/\D/g, "").slice(0, 12);
      if (digits.length <= 4) return digits;
      if (digits.length <= 8) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
      return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
    },
    validate: (v) => {
      const digits = v.replace(/\s/g, "");
      if (!/^\d{12}$/.test(digits)) return "Aadhaar must be exactly 12 digits";
      return null;
    },
  },
  PAN_CARD: {
    label: "PAN Number",
    hint: "5 letters + 4 digits + 1 letter (e.g. ABCDE1234F)",
    placeholder: "ABCDE1234F",
    required: true,
    maxLength: 10,
    inputMode: "text",
    filter: (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10),
    validate: (v) => {
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v.toUpperCase()))
        return "PAN format: 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F)";
      return null;
    },
  },
  PASSPORT: {
    label: "Passport Number",
    hint: "1 letter + 7 digits (e.g. A1234567)",
    placeholder: "A1234567",
    required: true,
    maxLength: 8,
    inputMode: "text",
    filter: (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8),
    validate: (v) => {
      if (!/^[A-Z][0-9]{7}$/.test(v.toUpperCase()))
        return "Passport format: 1 letter followed by 7 digits";
      return null;
    },
  },
  DRIVING_LICENSE: {
    label: "DL Number",
    hint: "State code + year + number (e.g. MH0120190012345)",
    placeholder: "MH0120190012345",
    required: true,
    maxLength: 20,
    inputMode: "text",
    filter: (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20),
    validate: (v) => {
      const clean = v.replace(/[\s-]/g, "").toUpperCase();
      if (clean.length < 8 || clean.length > 16)
        return "DL number must be 8–16 alphanumeric characters";
      if (!/^[A-Z0-9]+$/.test(clean)) return "DL number must contain only letters and digits";
      return null;
    },
  },
  VOTER_ID: {
    label: "Voter ID Number",
    hint: "3 letters + 7 digits (e.g. ABC1234567)",
    placeholder: "ABC1234567",
    required: true,
    maxLength: 10,
    inputMode: "text",
    filter: (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10),
    validate: (v) => {
      if (!/^[A-Z]{3}[0-9]{7}$/.test(v.toUpperCase()))
        return "Voter ID: 3 letters followed by 7 digits";
      return null;
    },
  },
  BANK_STATEMENT: {
    label: "Account / Reference Number",
    hint: "Optional reference from the bank statement",
    placeholder: "Optional",
    required: false,
    maxLength: 40,
    inputMode: "text",
    filter: (v) => v,
    validate: () => null,
  },
  UTILITY_BILL: {
    label: "Consumer / Account Number",
    hint: "Optional account number from utility bill",
    placeholder: "Optional",
    required: false,
    maxLength: 40,
    inputMode: "text",
    filter: (v) => v,
    validate: () => null,
  },
  OTHER: {
    label: "ID / Reference Number",
    hint: "Enter the ID number as printed on your document",
    placeholder: "e.g. ID123456",
    required: false,
    maxLength: 40,
    inputMode: "text",
    filter: (v) => v,
    validate: () => null,
  },
};

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
  const [docError, setDocError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [currentKyc, setCurrentKyc] = useState<KycRecord | null>(existing);

  const canResubmit = !currentKyc || currentKyc.status === "REJECTED";
  const rule = DOC_RULES[documentType] ?? DOC_RULES.OTHER;

  function handleDocTypeChange(type: string) {
    setDocumentType(type);
    setDocumentNumber("");
    setDocError("");
  }

  function handleDocNumberInput(raw: string) {
    const filtered = (DOC_RULES[documentType] ?? DOC_RULES.OTHER).filter(raw);
    setDocumentNumber(filtered);
    if (docError) setDocError(""); // clear error on change
  }

  function validateDocNumber(): boolean {
    if (!rule.required && !documentNumber) return true;
    const err = rule.validate(documentNumber);
    if (err) { setDocError(err); return false; }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) { setError("Full name is required"); return; }
    if (!validateDocNumber()) return;

    setLoading(true);
    setError("");
    setDocError("");

    // Normalise: strip spaces for Aadhaar before sending
    const normalised = documentType === "AADHAAR"
      ? documentNumber.replace(/\s/g, "")
      : documentNumber.trim();

    try {
      const res = await fetch("/api/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType,
          fullName: fullName.trim(),
          documentNumber: normalised || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Submission failed"); return; }
      setSuccess(true);
      setCurrentKyc({
        ...currentKyc,
        status: "PENDING_REVIEW",
        documentType,
        fullName,
        documentNumber: normalised,
        submittedAt: new Date().toISOString(),
      } as KycRecord);
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
          Your documents have been submitted and are under review. You'll be notified once verified.
        </p>
        {currentKyc && (
          <div className="mt-3 bg-slate-50 rounded-lg px-4 py-3 text-left w-full max-w-xs">
            <p className="text-xs text-slate-500">Document type</p>
            <p className="text-sm font-medium text-slate-800">
              {DOC_TYPES.find((d) => d.value === currentKyc.documentType)?.label ?? currentKyc.documentType}
            </p>
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

      {/* Document type */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Government ID Type <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <select
            value={documentType}
            onChange={(e) => handleDocTypeChange(e.target.value)}
            className="w-full appearance-none border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {DOC_TYPES.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Full name */}
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

      {/* Document number — strict per type */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {rule.label}
          {rule.required
            ? <span className="text-red-500 ml-1">*</span>
            : <span className="text-slate-400 text-xs font-normal ml-1">(optional)</span>}
        </label>
        <input
          type="text"
          inputMode={rule.inputMode}
          value={documentNumber}
          onChange={(e) => handleDocNumberInput(e.target.value)}
          onBlur={validateDocNumber}
          placeholder={rule.placeholder}
          maxLength={rule.maxLength}
          className={`w-full border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
            docError ? "border-red-400 bg-red-50" : "border-slate-300"
          }`}
        />
        {docError ? (
          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
            <AlertCircle size={12} /> {docError}
          </p>
        ) : (
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <Info size={11} /> {rule.hint}
          </p>
        )}
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
