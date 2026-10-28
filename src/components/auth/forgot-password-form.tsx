"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Mail, CheckCircle } from "lucide-react";

const Schema = z.object({
  email: z.string().email("Enter a valid email address"),
});
type FormData = z.infer<typeof Schema>;

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(Schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSent(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center py-4">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mb-4">
          <CheckCircle className="w-7 h-7 text-green-600" />
        </div>
        <h3 className="font-semibold text-slate-900 mb-1">Check your inbox</h3>
        <p className="text-sm text-slate-500">
          If that email is registered, you&apos;ll receive a reset link within a few minutes.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
          Email address
        </label>
        <input
          {...register("email")}
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="you@company.com"
        />
        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
      >
        {isLoading ? (
          <><Loader2 size={16} className="animate-spin" /> Sending...</>
        ) : (
          <><Mail size={16} /> Send reset link</>
        )}
      </button>
    </form>
  );
}
