"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, LogIn, Loader2 } from "lucide-react";
import Link from "next/link";

const LoginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof LoginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setServerError(null);

    const result = await signIn("credentials", {
      email: data.email.toLowerCase().trim(),
      password: data.password,
      redirect: false,
    });

    setIsLoading(false);

    if (result?.error) {
      if (result.error === "AccountLocked") {
        setServerError("Your account has been temporarily locked due to too many failed attempts. Try again in 15 minutes.");
      } else if (result.error === "PendingVerification") {
        setServerError("Your account is pending verification by an administrator. You'll be notified once it's activated.");
      } else if (result.error === "MfaRequired" || result.error === "MfaInvalid") {
        setServerError("Two-factor authentication is required for your account. Please contact your administrator.");
      } else if (result.error === "MfaNotConfigured") {
        setServerError("Your account requires MFA setup. Please contact your administrator.");
      } else {
        setServerError("Invalid email or password. Please try again.");
      }
      return;
    }

    // Determine redirect based on role from session
    const sessionRes = await fetch("/api/auth/session");
    const sessionData = await sessionRes.json();
    const role = sessionData?.user?.role;
    const defaultUrl = role === "CLIENT" ? "/portal" : "/dashboard";
    const callbackUrl = searchParams.get("callbackUrl") ?? defaultUrl;
    router.push(callbackUrl);
    router.refresh();
  };

  const errorFromParams = searchParams.get("error");
  const registeredParam = searchParams.get("registered");
  const resetParam = searchParams.get("reset");

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {registeredParam === "1" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
          Account created! Sign in below, then complete KYC verification in your portal settings.
        </div>
      )}
      {resetParam === "1" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
          Password updated! Sign in with your new password.
        </div>
      )}
      {(serverError || errorFromParams) && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {serverError ?? "Authentication failed. Please try again."}
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
          aria-describedby={errors.email ? "email-error" : undefined}
        />
        {errors.email && (
          <p id="email-error" className="mt-1 text-xs text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <Link href="/forgot-password" className="text-xs text-blue-600 hover:text-blue-700">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <input
            {...register("password")}
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
            placeholder="••••••••"
            aria-describedby={errors.password ? "password-error" : undefined}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.password && (
          <p id="password-error" className="mt-1 text-xs text-red-600">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
      >
        {isLoading ? (
          <><Loader2 size={16} className="animate-spin" /> Signing in...</>
        ) : (
          <><LogIn size={16} /> Sign In</>
        )}
      </button>
    </form>
  );
}
