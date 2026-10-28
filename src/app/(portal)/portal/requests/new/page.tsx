import { Metadata } from "next";
import { PaymentRequestForm } from "@/components/user/payment-request-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "New Request" };

export default function NewRequestPage() {
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
