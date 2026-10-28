import { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { SignupForm } from "@/components/auth/signup-form";
import { Building2, ShieldCheck, Users, FileText } from "lucide-react";
import type { UserRole } from "@prisma/client";

export const metadata: Metadata = { title: "Create Account" };

export default async function RegisterPage() {
  const session = await getServerSession(authOptions);
  if (session) {
    const role = (session.user as any)?.role as UserRole;
    if (role === "CLIENT") redirect("/portal");
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-slate-900 to-blue-950 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <Building2 size={18} className="text-white" />
          </div>
          <span className="font-bold text-white text-lg">FD Portal</span>
        </div>

        <div>
          <h2 className="text-3xl font-extrabold text-white leading-tight mb-4">
            Start managing your deposits smarter
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed mb-8">
            Create a client account to submit deposit requests, track approvals, and
            manage your portfolio — all in one place.
          </p>

          <div className="space-y-4">
            {[
              {
                icon: ShieldCheck,
                title: "Secure & KYC-verified",
                desc: "Sign in instantly — submit KYC docs to unlock full access",
              },
              {
                icon: Users,
                title: "Multi-level approvals",
                desc: "Your requests go through a proper review workflow",
              },
              {
                icon: FileText,
                title: "Full transparency",
                desc: "Track every step of your request in real time",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center mt-0.5">
                  <item.icon size={14} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{item.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-500 text-sm">
          © {new Date().getFullYear()} FD Portal. All rights reserved.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building2 size={16} className="text-white" />
            </div>
            <span className="font-bold text-slate-900">FD Portal</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
            <p className="text-slate-500 text-sm mt-1">
              Fill in the details below to request portal access
            </p>
          </div>

          <SignupForm />

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
