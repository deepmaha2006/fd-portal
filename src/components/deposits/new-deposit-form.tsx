"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Calculator } from "lucide-react";
import { calculateMaturityAmount, depositDaysHeld } from "@/lib/deposit-utils";

const FormSchema = z.object({
  depositType: z.enum(["FIXED_DEPOSIT", "SECURITY_DEPOSIT", "BANK_GUARANTEE", "EARNEST_MONEY", "LEASE_DEPOSIT", "OTHER"]),
  certificateNumber: z.string().max(100).optional(),
  bankId: z.string().optional(),
  accountNumber: z.string().max(50).optional(),
  beneficiaryId: z.string().optional(),
  issuingOrganization: z.string().max(200).optional(),
  vendorReference: z.string().max(200).optional(),
  contractNumber: z.string().max(100).optional(),
  principalAmount: z.coerce.number().positive("Must be positive").max(999999999999),
  currency: z.string().length(3).default("INR"),
  interestRate: z.coerce.number().min(0).max(100).optional(),
  issueDate: z.string().min(1, "Issue date is required"),
  maturityDate: z.string().optional(),
  expiryDate: z.string().optional(),
  departmentId: z.string().optional(),
  notes: z.string().max(5000).optional(),
});

type FormData = z.infer<typeof FormSchema>;

interface Props {
  banks: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string }>;
  beneficiaries: Array<{ id: string; name: string }>;
}

export function NewDepositForm({ banks, departments, beneficiaries }: Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [maturityPreview, setMaturityPreview] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: { depositType: "FIXED_DEPOSIT", currency: "INR" },
  });

  const principalAmount = watch("principalAmount");
  const interestRate = watch("interestRate");
  const issueDate = watch("issueDate");
  const maturityDate = watch("maturityDate");

  // Live maturity calculation
  function previewMaturity() {
    if (!principalAmount || !interestRate || !issueDate || !maturityDate) {
      setMaturityPreview(null);
      return;
    }
    const days = depositDaysHeld(new Date(issueDate), new Date(maturityDate));
    setMaturityPreview(calculateMaturityAmount(principalAmount, interestRate, days));
  }

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    setServerError(null);

    // Clean up empty optional fields
    const payload = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== "" && v !== undefined)
    );

    try {
      const res = await fetch("/api/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        setServerError(result.error ?? "Failed to create deposit");
        return;
      }

      router.push(`/deposits/${result.data.id}`);
      router.refresh();
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* Type */}
      <Card title="Deposit Type">
        <Field label="Type *" error={errors.depositType?.message}>
          <select {...register("depositType")} className={inputClass}>
            <option value="FIXED_DEPOSIT">Fixed Deposit</option>
            <option value="SECURITY_DEPOSIT">Security Deposit</option>
            <option value="BANK_GUARANTEE">Bank Guarantee</option>
            <option value="EARNEST_MONEY">Earnest Money Deposit</option>
            <option value="LEASE_DEPOSIT">Lease Deposit</option>
            <option value="OTHER">Other</option>
          </select>
        </Field>
        <Field label="Certificate / FDR Number" error={errors.certificateNumber?.message}>
          <input {...register("certificateNumber")} type="text" className={inputClass} placeholder="Bank-issued certificate number" />
        </Field>
      </Card>

      {/* Bank */}
      <Card title="Bank Details">
        <Field label="Bank">
          <select {...register("bankId")} className={inputClass}>
            <option value="">Select bank...</option>
            {banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
        <Field label="Account Number">
          <input {...register("accountNumber")} type="text" className={inputClass} placeholder="Account / folio number" />
        </Field>
      </Card>

      {/* Parties */}
      <Card title="Parties">
        <Field label="Beneficiary">
          <select {...register("beneficiaryId")} className={inputClass}>
            <option value="">Select beneficiary...</option>
            {beneficiaries.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
        <Field label="Issuing Organization">
          <input {...register("issuingOrganization")} type="text" className={inputClass} />
        </Field>
        <Field label="Contract / Tender Number">
          <input {...register("contractNumber")} type="text" className={inputClass} />
        </Field>
        <Field label="Vendor Reference">
          <input {...register("vendorReference")} type="text" className={inputClass} />
        </Field>
      </Card>

      {/* Financials */}
      <Card title="Financial Details">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Principal Amount *" error={errors.principalAmount?.message}>
            <input
              {...register("principalAmount")}
              type="number"
              step="0.01"
              className={inputClass}
              placeholder="0.00"
              onChange={() => setTimeout(previewMaturity, 100)}
            />
          </Field>
          <Field label="Currency">
            <select {...register("currency")} className={inputClass}>
              <option value="INR">INR ₹</option>
              <option value="USD">USD $</option>
              <option value="EUR">EUR €</option>
              <option value="GBP">GBP £</option>
            </select>
          </Field>
        </div>
        <Field label="Interest Rate (% p.a.)">
          <input
            {...register("interestRate")}
            type="number"
            step="0.01"
            className={inputClass}
            placeholder="0.00"
            onChange={() => setTimeout(previewMaturity, 100)}
          />
        </Field>
        {maturityPreview !== null && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            <Calculator size={14} />
            Estimated maturity amount:{" "}
            <strong>
              {maturityPreview.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
            </strong>
          </div>
        )}
      </Card>

      {/* Dates */}
      <Card title="Dates">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Issue Date *" error={errors.issueDate?.message}>
            <input
              {...register("issueDate")}
              type="date"
              className={inputClass}
              onChange={() => setTimeout(previewMaturity, 100)}
            />
          </Field>
          <Field label="Maturity Date">
            <input
              {...register("maturityDate")}
              type="date"
              className={inputClass}
              onChange={() => setTimeout(previewMaturity, 100)}
            />
          </Field>
          <Field label="Expiry Date">
            <input {...register("expiryDate")} type="date" className={inputClass} />
          </Field>
        </div>
      </Card>

      {/* Organization */}
      <Card title="Organization">
        <Field label="Department">
          <select {...register("departmentId")} className={inputClass}>
            <option value="">Select department...</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Notes">
          <textarea
            {...register("notes")}
            rows={3}
            className={inputClass}
            placeholder="Additional notes..."
          />
        </Field>
      </Card>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm"
        >
          {isLoading && <Loader2 size={14} className="animate-spin" />}
          Create Deposit
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h2 className="font-semibold text-slate-900 mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
