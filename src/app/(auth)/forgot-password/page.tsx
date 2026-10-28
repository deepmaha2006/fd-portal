import { Metadata } from "next";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Forgot Password" };

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Building2 size={16} className="text-white" />
          </div>
          <span className="font-bold text-slate-900">FD Portal</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-900">Reset your password</h1>
            <p className="text-slate-500 text-sm mt-1">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          <ForgotPasswordForm />

          <p className="text-center text-sm text-slate-500 mt-6">
            Remember your password?{" "}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
