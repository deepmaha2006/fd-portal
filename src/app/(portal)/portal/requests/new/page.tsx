import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/permissions";
import { PaymentRequestForm } from "@/components/user/payment-request-form";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "New Request" };

export default async function NewRequestPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userId = getUserId(session)!;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isKycVerified: true },
  });

  if (!user?.isKycVerified) {
    return (
      <div className="max-w-2xl">
        <div className="mb-6">
          <Link href="/portal/requests" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors">
            <ArrowLeft size={14} /> Back to requests
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">New deposit request</h1>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-start gap-4">
          <ShieldCheck size={24} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="font-semibold text-amber-900 text-base">Identity Verification Required</h2>
            <p className="text-amber-800 text-sm mt-1">
              You need to complete KYC (identity) verification before submitting payment requests.
              Once an admin approves your verification, you can submit requests here.
            </p>
            <Link
              href="/portal/settings"
              className="inline-flex items-center gap-2 mt-4 text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <ShieldCheck size={14} /> Complete Verification →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/portal/requests" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors">
          <ArrowLeft size={14} /> Back to requests
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">New deposit request</h1>
        <p className="text-slate-500 text-sm mt-1">
          Fill in the details below and our team will review your request shortly.
        </p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <PaymentRequestForm />
      </div>
    </div>
  );
}
