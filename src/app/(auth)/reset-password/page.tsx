import { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Building2, Loader2 } from "lucide-react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Reset Password" };

export default function ResetPasswordPage() {
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
            <h1 className="text-xl font-bold text-slate-900">Set new password</h1>
            <p className="text-slate-500 text-sm mt-1">
              Choose a strong password for your account.
            </p>
          </div>

          <Suspense fallback={<div className="flex justify-center py-6"><Loader2 className="animate-spin text-slate-400" size={20} /></div>}>
            <ResetPasswordForm />
          </Suspense>

          <p className="text-center text-sm text-slate-500 mt-6">
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
