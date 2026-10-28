"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Send } from "lucide-react";

const Schema = z.object({
  type: z.enum(["NEW_DEPOSIT", "RENEWAL", "RELEASE", "PAYMENT_QUERY", "OTHER"]),
  description: z.string().min(20, "Please provide at least 20 characters of detail").max(2000),
  amount: z.string().optional(),
  currency: z.string().default("INR"),
  durationMonths: z.string().optional(),
  bankName: z.string().max(200).optional().or(z.literal("")),
  accountNumber: z.string().max(50).optional().or(z.literal("")),
  urgency: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
});

type FormData = z.infer<typeof Schema>;

const typeOptions = [
  { value: "NEW_DEPOSIT", label: "New Fixed Deposit", desc: "Request to create a new FD/security deposit" },
  { value: "RENEWAL", label: "Renewal", desc: "Renew an existing deposit before maturity" },
  { value: "RELEASE", label: "Release / Closure", desc: "Request to release or close a deposit" },
  { value: "PAYMENT_QUERY", label: "Payment Query", desc: "Query about a payment or transaction" },
  { value: "OTHER", label: "Other", desc: "Any other deposit-related request" },
];

const urgencyOptions = [
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

export function PaymentRequestForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(Schema),
    defaultValues: { urgency: "NORMAL", currency: "INR" },
  });

  const selectedType = watch("type");

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setServerError(null);

    try {
      const res = await fetch("/api/payment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          amount: data.amount ? parseFloat(data.amount) : undefined,
          durationMonths: data.durationMonths ? parseInt(data.durationMonths, 10) : undefined,
          bankName: data.bankName || undefined,
          accountNumber: data.accountNumber || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error ?? "Failed to submit request. Please try again.");
        return;
      }

      router.push(`/portal/requests/${json.data.id}?submitted=1`);
    } catch {
      setServerError("Network error. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {serverError && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* Request type */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">
          Request type <span className="text-red-500">*</span>
        </label>
        <div className="grid sm:grid-cols-2 gap-3">
          {typeOptions.map((opt) => (
            <label key={opt.value} className={`relative flex cursor-pointer rounded-xl border p-4 transition-all ${
              selectedType === opt.value
                ? "border-blue-600 bg-blue-50"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}>
              <input
                {...register("type")}
                type="radio"
                value={opt.value}
                className="sr-only"
              />
              <div>
                <p className={`text-sm font-semibold ${selectedType === opt.value ? "text-blue-700" : "text-slate-900"}`}>
                  {opt.label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
        {errors.type && <p className="mt-1 text-xs text-red-600">{errors.type.message}</p>}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
          Description <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-slate-500 mb-2">
          Provide full details about your request. Include dates, amounts, reference numbers, and any relevant context.
        </p>
        <textarea
          {...register("description")}
          id="description"
          rows={5}
          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          placeholder="e.g. I would like to request a new fixed deposit of ₹10,00,000 for a period of 12 months with SBI Bank, Account no. 12345678..."
        />
        {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
      </div>

      {/* Duration — shown for FD requests */}
      {(selectedType === "NEW_DEPOSIT" || selectedType === "RENEWAL") && (
        <div>
          <label htmlFor="durationMonths" className="block text-sm font-medium text-slate-700 mb-1">
            FD Duration (months) <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-slate-500 mb-2">
            Select the desired tenure for the fixed deposit (e.g. 12 months = 1 year, 36 months = 3 years).
          </p>
          <div className="flex flex-wrap gap-2">
            {[3, 6, 12, 24, 36, 60].map((m) => (
              <label key={m} className={`flex cursor-pointer items-center gap-1.5 px-4 py-2 rounded-lg border text-sm transition-colors ${
                watch("durationMonths") === String(m)
                  ? "border-blue-600 bg-blue-50 text-blue-700 font-medium"
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
              }`}>
                <input {...register("durationMonths")} type="radio" value={String(m)} className="sr-only" />
                {m < 12 ? `${m}M` : `${m / 12}Y`}
              </label>
            ))}
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1.5">
              <input
                {...register("durationMonths")}
                type="number"
                min="1"
                max="360"
                placeholder="Custom"
                className="w-16 text-sm border-0 focus:outline-none text-slate-700"
                onClick={(e) => e.currentTarget.select()}
              />
              <span className="text-xs text-slate-400">mo</span>
            </div>
          </div>
          {errors.durationMonths && <p className="mt-1 text-xs text-red-600">{errors.durationMonths.message}</p>}
        </div>
      )}

      {/* Amount + Currency */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor="amount" className="block text-sm font-medium text-slate-700 mb-1">
            Amount (if applicable)
          </label>
          <input
            {...register("amount")}
            id="amount"
            type="number"
            min="0"
            step="0.01"
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g. 1000000"
          />
        </div>
        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-slate-700 mb-1">
            Currency
          </label>
          <select
            {...register("currency")}
            id="currency"
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="INR">INR</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>
      </div>

      {/* Bank details */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="bankName" className="block text-sm font-medium text-slate-700 mb-1">
            Bank name
          </label>
          <input
            {...register("bankName")}
            id="bankName"
            type="text"
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g. State Bank of India"
          />
        </div>
        <div>
          <label htmlFor="accountNumber" className="block text-sm font-medium text-slate-700 mb-1">
            Account / FD number
          </label>
          <input
            {...register("accountNumber")}
            id="accountNumber"
            type="text"
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g. FD-2024-00123"
          />
        </div>
      </div>

      {/* Urgency */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
        <div className="flex gap-3 flex-wrap">
          {urgencyOptions.map((opt) => (
            <label key={opt.value} className={`flex cursor-pointer items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors ${
              watch("urgency") === opt.value
                ? "border-blue-600 bg-blue-50 text-blue-700 font-medium"
                : "border-slate-200 text-slate-600 hover:border-slate-300"
            }`}>
              <input {...register("urgency")} type="radio" value={opt.value} className="sr-only" />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 text-sm border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium rounded-lg text-sm transition-colors"
        >
          {isLoading ? (
            <><Loader2 size={15} className="animate-spin" /> Submitting...</>
          ) : (
            <><Send size={15} /> Submit request</>
          )}
        </button>
      </div>
    </form>
  );
}
