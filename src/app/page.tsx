import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import {
  Building2,
  ShieldCheck,
  TrendingUp,
  Bell,
  FileText,
  Users,
  ArrowRight,
  CheckCircle,
  Star,
} from "lucide-react";
import type { UserRole } from "@prisma/client";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) {
    const role = (session.user as any)?.role as UserRole;
    if (role === "CLIENT") redirect("/portal");
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Building2 size={16} className="text-white" />
              </div>
              <span className="font-bold text-slate-900">FD Portal</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm text-slate-600 hover:text-slate-900 font-medium px-4 py-2 rounded-md hover:bg-slate-50 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-blue-100">
            <Star size={12} />
            Trusted by 500+ financial organizations
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6">
            Manage Fixed Deposits
            <br />
            <span className="text-blue-600">with confidence</span>
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed mb-10">
            FD Portal centralizes your security deposits, bank guarantees, and fixed deposit
            management — with real-time tracking, automated reminders, and complete audit trails.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3.5 rounded-xl text-sm transition-colors shadow-lg shadow-blue-500/20"
            >
              Create your account
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 border border-slate-200 hover:border-slate-300 text-slate-700 font-medium px-8 py-3.5 rounded-xl text-sm transition-colors hover:bg-slate-50"
            >
              Sign in to portal
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Row */}
      <section className="py-12 bg-slate-900">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { value: "₹2,400 Cr+", label: "Deposits managed" },
            { value: "12,000+", label: "Active FDs tracked" },
            { value: "99.9%", label: "Uptime reliability" },
            { value: "< 2 min", label: "Avg. approval time" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl font-extrabold text-white">{stat.value}</p>
              <p className="text-slate-400 text-sm mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Everything you need to manage deposits
            </h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              From creation to maturity — every step of the deposit lifecycle, handled.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: ShieldCheck,
                title: "Role-based access control",
                desc: "Fine-grained permissions for admins, managers, officers, and auditors. Every action is tracked.",
                color: "blue",
              },
              {
                icon: Bell,
                title: "Smart maturity reminders",
                desc: "Automated alerts at 90, 60, 30, 15, 7, and 1 day before expiry. Never miss a renewal.",
                color: "amber",
              },
              {
                icon: TrendingUp,
                title: "Real-time reporting",
                desc: "Instant dashboards showing portfolio health, upcoming maturities, and interest accruals.",
                color: "green",
              },
              {
                icon: FileText,
                title: "Document management",
                desc: "Securely store FDR certificates, receipts, and correspondence with SHA-256 verification.",
                color: "purple",
              },
              {
                icon: Users,
                title: "Multi-level approvals",
                desc: "Configurable approval workflows with full audit trail for compliance and governance.",
                color: "rose",
              },
              {
                icon: Building2,
                title: "Multi-bank support",
                desc: "Manage deposits across multiple banks and branches from a single unified interface.",
                color: "indigo",
              },
            ].map((feature) => {
              const colorMap: Record<string, string> = {
                blue: "bg-blue-50 text-blue-600",
                amber: "bg-amber-50 text-amber-600",
                green: "bg-green-50 text-green-600",
                purple: "bg-purple-50 text-purple-600",
                rose: "bg-rose-50 text-rose-600",
                indigo: "bg-indigo-50 text-indigo-600",
              };
              return (
                <div
                  key={feature.title}
                  className="bg-slate-50 rounded-2xl p-6 hover:shadow-md transition-shadow border border-slate-100"
                >
                  <div className={`inline-flex p-2.5 rounded-xl mb-4 ${colorMap[feature.color]}`}>
                    <feature.icon size={20} />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">How it works</h2>
            <p className="text-lg text-slate-500">
              Get started in minutes. Submit requests and track them in real time.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Create an account",
                desc: "Sign up with your organization details. Your account is verified and activated by an admin.",
              },
              {
                step: "02",
                title: "Submit a request",
                desc: "Raise a new deposit request, renewal, or release. Attach supporting documents as needed.",
              },
              {
                step: "03",
                title: "Track in real time",
                desc: "Follow every step of your request — from submission to approval to completion.",
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="text-5xl font-extrabold text-blue-100 mb-3">{item.step}</div>
                <h3 className="font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 bg-blue-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to take control of your deposits?
          </h2>
          <p className="text-blue-100 text-lg mb-8">
            Join thousands of finance teams who trust FD Portal for their deposit management.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 font-semibold px-8 py-3 rounded-xl text-sm hover:bg-blue-50 transition-colors"
            >
              Get started free
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 border border-blue-400 text-white font-medium px-8 py-3 rounded-xl text-sm hover:bg-blue-700 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building2 size={14} className="text-white" />
            </div>
            <span className="text-white font-bold text-sm">FD Portal</span>
          </div>
          <div className="flex items-center gap-6 text-slate-400 text-sm">
            <Link href="/login" className="hover:text-white transition-colors">Sign in</Link>
            <Link href="/register" className="hover:text-white transition-colors">Register</Link>
          </div>
          <p className="text-slate-500 text-xs">
            © {new Date().getFullYear()} FD Portal. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
