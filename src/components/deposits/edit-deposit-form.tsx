"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

interface Bank { id: string; name: string; branches: { id: string; name: string }[] }
interface Beneficiary { id: string; name: string; type?: string | null }

interface Deposit {
  id: string;
  certificateNumber?: string | null;
  bankId?: string | null;
  branchId?: string | null;
  accountNumber?: string | null;
  beneficiaryId?: string | null;
  issuingOrganization?: string | null;
  vendorReference?: string | null;
  contractNumber?: string | null;
  principalAmount: number;
  currency: string;
  interestRate?: number | null;
  issueDate: string;
  maturityDate?: string | null;
  expiryDate?: string | null;
  isRenewalEligible: boolean;
  notes?: string | null;
  referenceNumber: string;
}

interface Props {
  deposit: Deposit;
  banks: Bank[];
  beneficiaries: Beneficiary[];
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export function EditDepositForm({ deposit, banks, beneficiaries }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    certificateNumber: deposit.certificateNumber ?? "",
    bankId: deposit.bankId ?? "",
    branchId: deposit.branchId ?? "",
    accountNumber: deposit.accountNumber ?? "",
    beneficiaryId: deposit.beneficiaryId ?? "",
    issuingOrganization: deposit.issuingOrganization ?? "",
    vendorReference: deposit.vendorReference ?? "",
    contractNumber: deposit.contractNumber ?? "",
    principalAmount: String(deposit.principalAmount),
    currency: deposit.currency,
    interestRate: deposit.interestRate != null ? String(deposit.interestRate) : "",
    issueDate: fmtDate(deposit.issueDate),
    maturityDate: fmtDate(deposit.maturityDate),
    expiryDate: fmtDate(deposit.expiryDate),
    isRenewalEligible: deposit.isRenewalEligible,
    notes: deposit.notes ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedBank = banks.find((b) => b.id === form.bankId);
  const branches = selectedBank?.branches ?? [];

  const handleBankChange = (bankId: string) => {
    setForm((f) => ({ ...f, bankId, branchId: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload: Record<string, unknown> = {
      certificateNumber: form.certificateNumber || undefined,
      bankId: form.bankId || null,
      branchId: form.branchId || null,
      accountNumber: form.accountNumber || null,
      beneficiaryId: form.beneficiaryId || null,
      issuingOrganization: form.issuingOrganization || null,
      vendorReference: form.vendorReference || null,
      contractNumber: form.contractNumber || null,
      principalAmount: Number(form.principalAmount),
      currency: form.currency,
      interestRate: form.interestRate !== "" ? Number(form.interestRate) : null,
      issueDate: form.issueDate || undefined,
      maturityDate: form.maturityDate || null,
      expiryDate: form.expiryDate || null,
      isRenewalEligible: form.isRenewalEligible,
      notes: form.notes || null,
    };

    try {
      const res = await fetch(`/api/deposits/${deposit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save changes");
        return;
      }

      router.push(`/deposits/${deposit.id}`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link
          href={`/deposits/${deposit.id}`}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3"
        >
          <ArrowLeft size={14} /> Back to deposit
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Edit Deposit</h1>
        <p className="text-slate-500 text-sm mt-1">Reference: {deposit.referenceNumber}</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        {error && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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
                  required
                  step="0.01"
                  min="0.01"
                  value={form.principalAmount}
                  onChange={(e) => setForm({ ...form, principalAmount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Currency <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={3}
                  minLength={3}
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                  placeholder="INR"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                />
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  required
                  value={form.issueDate}
                  onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Maturity Date
                </label>
                <input
                  type="date"
                  value={form.maturityDate}
                  onChange={(e) => setForm({ ...form, maturityDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </fieldset>

          {/* Bank & Beneficiary */}
          <fieldset>
            <legend className="text-sm font-semibold text-slate-900 mb-3 pb-1 border-b border-slate-100 w-full">
              Bank & Parties
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bank</label>
                <select
                  value={form.bankId}
                  onChange={(e) => handleBankChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50"
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
                  placeholder="Will be stored encrypted"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Beneficiary</label>
                <select
                  value={form.beneficiaryId}
                  onChange={(e) => setForm({ ...form, beneficiaryId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
              Save Changes
            </button>
            <Link
              href={`/deposits/${deposit.id}`}
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
