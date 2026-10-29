"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Lock, Info } from "lucide-react";

const DEPOSIT_TYPES = [
  { value: "FIXED_DEPOSIT", label: "Fixed Deposit" },
  { value: "SECURITY_DEPOSIT", label: "Security Deposit" },
  { value: "BANK_GUARANTEE", label: "Bank Guarantee" },
  { value: "EARNEST_MONEY", label: "Earnest Money" },
  { value: "LEASE_DEPOSIT", label: "Lease Deposit" },
  { value: "OTHER", label: "Other" },
];

interface Bank { id: string; name: string; branches: { id: string; name: string }[] }
interface Beneficiary { id: string; name: string; type?: string | null }

interface Props {
  banks: Bank[];
  beneficiaries: Beneficiary[];
}

function addMonths(dateStr: string, months: number): string {
  if (!dateStr || !months) return "";
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function CreateDepositForm({ banks, beneficiaries }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const amountParam = searchParams.get("amount") ?? "";
  const currencyParam = searchParams.get("currency") ?? "INR";
  const bankNameParam = decodeURIComponent(searchParams.get("bankName") ?? "");
  const accountNumberParam = decodeURIComponent(searchParams.get("accountNumber") ?? "");
  const durationMonths = parseInt(searchParams.get("durationMonths") ?? "") || 0;
  const notesParam = searchParams.get("notes") ?? "";

  // Find bank by name (case-insensitive partial match)
  const matchedBank = bankNameParam
    ? banks.find(
        (b) =>
          b.name.toLowerCase() === bankNameParam.toLowerCase() ||
          b.name.toLowerCase().includes(bankNameParam.toLowerCase()) ||
          bankNameParam.toLowerCase().includes(b.name.toLowerCase())
      )
    : undefined;

  const today = new Date().toISOString().slice(0, 10);
  const initialMaturity = durationMonths ? addMonths(today, durationMonths) : "";

  const [form, setForm] = useState({
    depositType: "FIXED_DEPOSIT",
    certificateNumber: "",
    bankId: matchedBank?.id ?? "",
    branchId: "",
    accountNumber: accountNumberParam,
    beneficiaryId: "",
    issuingOrganization: "",
    vendorReference: "",
    contractNumber: "",
    principalAmount: amountParam,
    currency: currencyParam,
    interestRate: "",
    issueDate: today,
    maturityDate: initialMaturity,
    expiryDate: initialMaturity,
    isRenewalEligible: true,
    notes: notesParam,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedBank = banks.find((b) => b.id === form.bankId);
  const branches = selectedBank?.branches ?? [];

  const handleBankChange = (bankId: string) => {
    setForm((f) => ({ ...f, bankId, branchId: "" }));
  };

  const handleIssueDateChange = (value: string) => {
    setForm((f) => ({
      ...f,
      issueDate: value,
      maturityDate: durationMonths ? addMonths(value, durationMonths) : f.maturityDate,
      expiryDate: durationMonths ? addMonths(value, durationMonths) : f.expiryDate,
    }));
  };

  const clientValidate = (): string | null => {
    const amount = Number(form.principalAmount);
    if (!form.principalAmount || isNaN(amount) || amount <= 0) {
      return "Principal amount must be a positive number.";
    }
    if (amount > 999_999_999_999) {
      return "Principal amount is too large.";
    }
    if (!form.issueDate) {
      return "Issue date is required.";
    }
    if (form.maturityDate && form.maturityDate < form.issueDate) {
      return "Maturity date cannot be before the issue date.";
    }
    if (form.expiryDate && form.expiryDate < form.issueDate) {
      return "Expiry date cannot be before the issue date.";
    }
    if (form.expiryDate && form.maturityDate && form.expiryDate < form.maturityDate) {
      return "Expiry date cannot be before the maturity date.";
    }
    if (durationMonths > 0) {
      const maxDate = addMonths(form.issueDate, durationMonths);
      if (form.maturityDate && form.maturityDate > maxDate) {
        return `Maturity date cannot exceed the client-requested duration (${durationLabel}).`;
      }
    }
    if (form.interestRate !== "" && (isNaN(Number(form.interestRate)) || Number(form.interestRate) < 0 || Number(form.interestRate) > 100)) {
      return "Interest rate must be between 0 and 100.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const clientErr = clientValidate();
    if (clientErr) {
      setError(clientErr);
      return;
    }

    setLoading(true);

    const payload: Record<string, unknown> = {
      depositType: form.depositType,
      certificateNumber: form.certificateNumber || undefined,
      bankId: form.bankId || undefined,
      branchId: form.branchId || undefined,
      accountNumber: form.accountNumber || undefined,
      beneficiaryId: form.beneficiaryId || undefined,
      issuingOrganization: form.issuingOrganization || undefined,
      vendorReference: form.vendorReference || undefined,
      contractNumber: form.contractNumber || undefined,
      principalAmount: Number(form.principalAmount),
      currency: form.currency,
      interestRate: form.interestRate !== "" ? Number(form.interestRate) : undefined,
      issueDate: form.issueDate,
      maturityDate: form.maturityDate || undefined,
      expiryDate: form.expiryDate || undefined,
      isRenewalEligible: form.isRenewalEligible,
      notes: form.notes || undefined,
      tags: [],
    };

    try {
      const res = await fetch("/api/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.details) {
          const msgs = Object.entries(data.details)
            .map(([field, errs]) => `${field}: ${(errs as string[]).join(", ")}`)
            .join(" | ");
          setError(msgs || data.error || "Failed to create deposit");
        } else {
          setError(data.error ?? "Failed to create deposit");
        }
        return;
      }

      router.push(`/deposits/${data.data.id}`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const readonlyCls = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-600 cursor-not-allowed";

  const durationLabel =
    durationMonths >= 12
      ? `${durationMonths / 12} year${durationMonths > 12 ? "s" : ""} (${durationMonths} months)`
      : `${durationMonths} month${durationMonths !== 1 ? "s" : ""}`;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link
          href="/deposits"
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3"
        >
          <ArrowLeft size={14} /> Back to deposits
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">New Deposit</h1>
        <p className="text-slate-500 text-sm mt-1">Record a new deposit in the system.</p>
      </div>

      {durationMonths > 0 && (
        <div className="mb-4 flex items-start gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <Info size={15} className="mt-0.5 shrink-0" />
          <span>
            Client requested duration: <strong>{durationLabel}</strong>. Maturity and expiry dates are
            auto-calculated from the issue date you select and cannot exceed this duration.
          </span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        {error && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 whitespace-pre-line">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* Deposit Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Deposit Type <span className="text-red-500">*</span>
            </label>
            <select
              value={form.depositType}
              onChange={(e) => setForm({ ...form, depositType: e.target.value })}
              className={inputCls + " bg-white"}
            >
              {DEPOSIT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Financial Details */}
          <fieldset>
            <legend className="text-sm font-semibold text-slate-900 mb-3 pb-1 border-b border-slate-100 w-full">
              Financial Details
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Principal Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="999999999999"
                  value={form.principalAmount}
                  onChange={(e) => setForm({ ...form, principalAmount: e.target.value })}
                  placeholder="Enter amount"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Currency <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className={inputCls + " bg-white"}
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Interest Rate (% p.a.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={form.interestRate}
                  onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                  placeholder="e.g. 7.5"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Certificate Number
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={form.certificateNumber}
                  onChange={(e) => setForm({ ...form, certificateNumber: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>
          </fieldset>

          {/* Dates */}
          <fieldset>
            <legend className="text-sm font-semibold text-slate-900 mb-3 pb-1 border-b border-slate-100 w-full">
              Dates
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Issue Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.issueDate}
                  onChange={(e) => handleIssueDateChange(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                  Maturity Date
                  {durationMonths > 0 && <Lock size={11} className="text-slate-400" />}
                </label>
                {durationMonths > 0 ? (
                  <input
                    type="date"
                    value={form.maturityDate}
                    readOnly
                    className={readonlyCls}
                    title={`Locked: ${durationLabel} from issue date`}
                  />
                ) : (
                  <input
                    type="date"
                    value={form.maturityDate}
                    min={form.issueDate}
                    onChange={(e) => setForm({ ...form, maturityDate: e.target.value })}
                    className={inputCls}
                  />
                )}
                {durationMonths > 0 && (
                  <p className="text-xs text-slate-400 mt-1">Auto: issue date + {durationLabel}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                  Expiry Date
                  {durationMonths > 0 && <Lock size={11} className="text-slate-400" />}
                </label>
                {durationMonths > 0 ? (
                  <input
                    type="date"
                    value={form.expiryDate}
                    readOnly
                    className={readonlyCls}
                    title={`Locked: ${durationLabel} from issue date`}
                  />
                ) : (
                  <input
                    type="date"
                    value={form.expiryDate}
                    min={form.maturityDate || form.issueDate}
                    onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                    className={inputCls}
                  />
                )}
                {durationMonths > 0 && (
                  <p className="text-xs text-slate-400 mt-1">Auto: issue date + {durationLabel}</p>
                )}
              </div>
            </div>
          </fieldset>

          {/* Bank & Parties */}
          <fieldset>
            <legend className="text-sm font-semibold text-slate-900 mb-3 pb-1 border-b border-slate-100 w-full">
              Bank & Parties
            </legend>
            {bankNameParam && !matchedBank && (
              <p className="text-xs text-amber-600 mb-2">
                Client specified bank &quot;{bankNameParam}&quot; — select the matching entry below.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bank</label>
                <select
                  value={form.bankId}
                  onChange={(e) => handleBankChange(e.target.value)}
                  className={inputCls + " bg-white"}
                >
                  <option value="">— Select bank —</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
                <select
                  value={form.branchId}
                  onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                  disabled={!form.bankId || branches.length === 0}
                  className={inputCls + " bg-white disabled:opacity-50"}
                >
                  <option value="">— Select branch —</option>
                  {branches.map((br) => (
                    <option key={br.id} value={br.id}>{br.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={form.accountNumber}
                  onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                  placeholder="Stored encrypted"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Beneficiary</label>
                <select
                  value={form.beneficiaryId}
                  onChange={(e) => setForm({ ...form, beneficiaryId: e.target.value })}
                  className={inputCls + " bg-white"}
                >
                  <option value="">— Select beneficiary —</option>
                  {beneficiaries.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}{b.type ? ` (${b.type})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>

          {/* References */}
          <fieldset>
            <legend className="text-sm font-semibold text-slate-900 mb-3 pb-1 border-b border-slate-100 w-full">
              References
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Issuing Organization
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={form.issuingOrganization}
                  onChange={(e) => setForm({ ...form, issuingOrganization: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Contract Number
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={form.contractNumber}
                  onChange={(e) => setForm({ ...form, contractNumber: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Vendor Reference
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={form.vendorReference}
                  onChange={(e) => setForm({ ...form, vendorReference: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>
          </fieldset>

          {/* Notes & Options */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea
                rows={4}
                maxLength={5000}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className={inputCls + " resize-none"}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isRenewalEligible}
                onChange={(e) => setForm({ ...form, isRenewalEligible: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">Eligible for renewal</span>
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Create Deposit
            </button>
            <Link
              href="/deposits"
              className="px-5 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
