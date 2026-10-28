"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Send, CheckCircle } from "lucide-react";

const Schema = z.object({
  type: z.enum(["NEW_DEPOSIT", "RENEWAL", "RELEASE", "PAYMENT_QUERY", "OTHER"]),
  description: z.string().min(20, "Please provide at least 20 characters of detail").max(2000),
  amount: z.string().optional(),
  currency: z.string().default("INR"),
  bankName: z.string().max(200).optional().or(z.literal("")),
  accountNumber: z.string().max(50).optional().or(z.literal("")),
  urgency: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
});

type FormData = z.infer<typeof Schema>;

const typeOptions = [
  { value: "NEW_DEPOSIT", label: "New Fixed Deposit", desc: "Request to create a new FD/security deposit" },
  { value: "RENEWAL",     label: "Renewal",           desc: "Renew an existing deposit before maturity" },
  { value: "RELEASE",     label: "Release / Closure", desc: "Request to release or close a deposit" },
  { value: "PAYMENT_QUERY", label: "Payment Query",   desc: "Query about a payment or transaction" },
  { value: "OTHER",       label: "Other",             desc: "Any other deposit-related request" },
];

const urgencyOptions = [
  { value: "LOW",    label: "Low",    color: "text-slate-600"  },
  { value: "NORMAL", label: "Normal", color: "text-blue-600"   },
  { value: "HIGH",   label: "High",   color: "text-amber-600"  },
  { value: "URGENT", label: "Urgent", color: "text-red-600"    },
];

const DURATION_PRESETS = [
  { months: 3,  label: "3 Months"  },
  { months: 6,  label: "6 Months"  },
  { months: 12, label: "1 Year"    },
  { months: 24, label: "2 Years"   },
  { months: 36, label: "3 Years"   },
  { months: 60, label: "5 Years"   },
];

export function PaymentRequestForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [durationMonths, setDurationMonths] = useState<number | "">("");
  const [customDuration, setCustomDuration] = useState("");

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(Schema),
    defaultValues: { urgency: "NORMAL", currency: "INR" },
  });

  const selectedType = watch("type");
  const needsDuration = selectedType === "NEW_DEPOSIT" || selectedType === "RENEWAL";

  const selectPreset = (months: number) => {
    setDurationMonths(months);
    setCustomDuration("");
  };

  const handleCustomDuration = (val: string) => {
    setCustomDuration(val);
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 1 && n <= 360) {
      setDurationMonths(n);
    } else {
      setDurationMonths("");
    }
  };

  const onSubmit = async (data: FormData) => {
    if (needsDuration && !durationMonths) {
      return; // handled by inline validation UI below
    }
    setIsLoading(true);
    setServerError(null);

    try {
      const res = await fetch("/api/payment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          amount: data.amount ? parseFloat(data.amount) : undefined,
          durationMonths: durationMonths || undefined,
          bankName: data.bankName || undefined,
          accountNumber: data.accountNumber || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setServerError(json.message ?? json.error ?? "Failed to submit request. Please try again.");
        return;
      }

      router.push(`/portal/requests/${json.data.id}?submitted=1`);
    } catch {
      setServerError("Network error. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const showDurationError = needsDuration && !durationMonths;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-7">
      {serverError && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex gap-3 items-start">
          <span className="mt-0.5 shrink-0">⚠</span>
          <span>{serverError}</span>
        </div>
      )}

      {/* ── Request type ──────────────────────────────── */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-3">
          Request type <span className="text-red-500">*</span>
        </label>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {typeOptions.map((opt) => {
            const isSelected = selectedType === opt.value;
            return (
              <label key={opt.value} className={`relative flex cursor-pointer rounded-xl border-2 p-4 transition-all select-none ${
                isSelected
                  ? "border-blue-600 bg-blue-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}>
                <input {...register("type")} type="radio" value={opt.value} className="sr-only" />
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${isSelected ? "text-blue-700" : "text-slate-900"}`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{opt.desc}</p>
                </div>
                {isSelected && (
                  <CheckCircle size={16} className="text-blue-600 shrink-0 ml-2 mt-0.5" />
                )}
              </label>
            );
          })}
        </div>
        {errors.type && <p className="mt-2 text-xs text-red-600">{errors.type.message}</p>}
      </div>

      {/* ── FD Duration (only for NEW_DEPOSIT / RENEWAL) ── */}
      {needsDuration && (
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            FD Duration <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-slate-500 mb-3">
            Choose a preset tenure or enter a custom duration in months.
          </p>

          <div className="flex flex-wrap gap-2 mb-3">
            {DURATION_PRESETS.map(({ months, label }) => {
              const isActive = durationMonths === months && !customDuration;
              return (
                <button
                  key={months}
                  type="button"
                  onClick={() => selectPreset(months)}
                  className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    isActive
                      ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-600"
                  }`}
                >
                  {label}
                </button>
              );
            })}

            {/* Custom input */}
            <div className={`flex items-center gap-2 rounded-lg border-2 px-3 py-1.5 transition-all ${
              customDuration && durationMonths
                ? "border-blue-600 bg-blue-50"
                : "border-slate-200 bg-white"
            }`}>
              <input
                type="number"
                min="1"
                max="360"
                value={customDuration}
                onChange={(e) => handleCustomDuration(e.target.value)}
                placeholder="Custom"
                className="w-16 text-sm bg-transparent border-0 focus:outline-none text-slate-700 placeholder-slate-400"
              />
              <span className="text-xs text-slate-400 font-medium">months</span>
            </div>
          </div>

          {durationMonths ? (
            <p className="text-xs text-blue-700 font-medium">
              ✓ Selected: {durationMonths} month{durationMonths !== 1 ? "s" : ""}
              {durationMonths >= 12 && ` (${(durationMonths / 12).toFixed(1).replace(/\.0$/, "")} year${durationMonths >= 24 ? "s" : ""})`}
            </p>
          ) : (
            showDurationError && (
              <p className="text-xs text-red-600">Please select a duration for the fixed deposit.</p>
            )
          )}
        </div>
      )}

      {/* ── Description ──────────────────────────────── */}
      <div>
        <label htmlFor="description" className="block text-sm font-semibold text-slate-700 mb-1">
          Description <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-slate-500 mb-2">
          Include dates, amounts, reference numbers, and any relevant context.
        </p>
        <textarea
          {...register("description")}
          id="description"
          rows={4}
          className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-shadow"
          placeholder="e.g. I would like to request a new fixed deposit of ₹10,00,000 for 12 months with SBI Bank..."
        />
        {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
      </div>

      {/* ── Amount + Currency ─────────────────────────── */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor="amount" className="block text-sm font-semibold text-slate-700 mb-1">
            Amount {needsDuration && <span className="text-red-500">*</span>}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">₹</span>
            <input
              {...register("amount")}
              id="amount"
              type="number"
              min="0"
              step="0.01"
              className="w-full pl-7 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              placeholder="e.g. 1000000"
            />
          </div>
        </div>
        <div>
          <label htmlFor="currency" className="block text-sm font-semibold text-slate-700 mb-1">Currency</label>
          <select
            {...register("currency")}
            id="currency"
            className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-shadow"
          >
            <option value="INR">₹ INR</option>
            <option value="USD">$ USD</option>
            <option value="EUR">€ EUR</option>
            <option value="GBP">£ GBP</option>
          </select>
        </div>
      </div>

      {/* ── Bank details ──────────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="bankName" className="block text-sm font-semibold text-slate-700 mb-1">Bank name</label>
          <input
            {...register("bankName")}
            id="bankName"
            type="text"
            className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            placeholder="e.g. State Bank of India"
          />
        </div>
        <div>
          <label htmlFor="accountNumber" className="block text-sm font-semibold text-slate-700 mb-1">Account / FD number</label>
          <input
            {...register("accountNumber")}
            id="accountNumber"
            type="text"
            className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            placeholder="e.g. FD-2024-00123"
          />
        </div>
      </div>

      {/* ── Priority ──────────────────────────────────── */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Priority</label>
        <div className="flex gap-2 flex-wrap">
          {urgencyOptions.map((opt) => {
            const isActive = watch("urgency") === opt.value;
            return (
              <label key={opt.value} className={`flex cursor-pointer items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all select-none ${
                isActive
                  ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                  : "border-slate-200 text-slate-600 hover:border-slate-300 bg-white"
              }`}>
                <input {...register("urgency")} type="radio" value={opt.value} className="sr-only" />
                {opt.label}
              </label>
            );
          })}
        </div>
      </div>

      {/* ── Actions ───────────────────────────────────── */}
      <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 text-sm border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading || (needsDuration && !durationMonths)}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
        >
          {isLoading ? (
            <><Loader2 size={15} className="animate-spin" /> Submitting...</>
          ) : (
            <><Send size={15} /> Submit Request</>
          )}
        </button>
      </div>
    </form>
  );
}
