"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";

const Schema = z.object({
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(128)
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/[0-9]/, "Must contain a number")
    .regex(/[^A-Za-z0-9]/, "Must contain a special character"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
type FormData = z.infer<typeof Schema>;

const passwordRules = [
  { label: "At least 12 characters", test: (p: string) => p.length >= 12 },
  { label: "Uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "Number", test: (p: string) => /[0-9]/.test(p) },
  { label: "Special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(Schema),
  });

  const password = watch("password", "");

  if (!token) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-red-600">
          Invalid reset link. Please request a new one from the{" "}
          <a href="/forgot-password" className="underline">forgot password</a> page.
        </p>
      </div>
    );
  }

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to reset password. Please try again.");
        return;
      }
      router.push("/login?reset=1");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
          New password
        </label>
        <div className="relative">
          <input
            {...register("password")}
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
            placeholder="••••••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {password && (
          <div className="mt-2 grid grid-cols-2 gap-1">
            {passwordRules.map((rule) => (
              <div key={rule.label} className={`flex items-center gap-1.5 text-xs ${rule.test(password) ? "text-green-600" : "text-slate-400"}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${rule.test(password) ? "bg-green-500" : "bg-slate-300"}`} />
                {rule.label}
              </div>
            ))}
          </div>
        )}
        {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">
          Confirm new password
        </label>
        <div className="relative">
          <input
            {...register("confirmPassword")}
            id="confirmPassword"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
            placeholder="••••••••••••"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
      >
        {isLoading ? (
          <><Loader2 size={16} className="animate-spin" /> Updating...</>
        ) : (
          <><ShieldCheck size={16} /> Set new password</>
        )}
      </button>
    </form>
  );
}
