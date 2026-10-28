import { Metadata } from "next";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/permissions";
import { ShieldCheck, User, Lock, Mail, Clock, CheckCircle2 } from "lucide-react";
import { KycForm } from "@/components/portal/kyc-form";
import { ProfileEdit } from "@/components/portal/profile-edit";

export const metadata: Metadata = { title: "Settings" };

export default async function PortalSettingsPage() {
  const session = await getSession();
  const userId = getUserId(session!)!;

  const [user, kycRecord] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        department: true,
        status: true,
        isKycVerified: true,
        createdAt: true,
        lastLoginAt: true,
      },
    }),
    prisma.kycVerification.findUnique({
      where: { userId },
      include: { reviewedBy: { select: { name: true } } },
    }),
  ]);

  if (!user) return null;

  const kycStatusLabel =
    !kycRecord ? "Not submitted"
    : kycRecord.status === "PENDING_REVIEW" ? "Under review"
    : kycRecord.status === "APPROVED" ? "Verified"
    : "Rejected";

  const kycStatusColor =
    !kycRecord ? "bg-slate-100 text-slate-600"
    : kycRecord.status === "PENDING_REVIEW" ? "bg-amber-100 text-amber-700"
    : kycRecord.status === "APPROVED" ? "bg-green-100 text-green-700"
    : "bg-red-100 text-red-700";

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your profile and identity verification</p>
      </div>

      {/* KYC status banner */}
      {!user.isKycVerified && (
        <div className={`flex items-start gap-3 rounded-xl border p-4 ${
          !kycRecord ? "bg-blue-50 border-blue-200" :
          kycRecord.status === "PENDING_REVIEW" ? "bg-amber-50 border-amber-200" :
          "bg-red-50 border-red-200"
        }`}>
          <ShieldCheck size={18} className={`flex-shrink-0 mt-0.5 ${
            !kycRecord ? "text-blue-600" :
            kycRecord.status === "PENDING_REVIEW" ? "text-amber-600" :
            "text-red-600"
          }`} />
          <div>
            <p className={`text-sm font-medium ${
              !kycRecord ? "text-blue-800" :
              kycRecord.status === "PENDING_REVIEW" ? "text-amber-800" :
              "text-red-800"
            }`}>
              {!kycRecord
                ? "Identity verification required"
                : kycRecord.status === "PENDING_REVIEW"
                ? "Verification under review"
                : "Verification rejected — please resubmit"}
            </p>
            <p className={`text-sm mt-0.5 ${
              !kycRecord ? "text-blue-700" :
              kycRecord.status === "PENDING_REVIEW" ? "text-amber-700" :
              "text-red-700"
            }`}>
              {!kycRecord
                ? "Submit your government ID below to unlock payment requests."
                : kycRecord.status === "PENDING_REVIEW"
                ? "Your documents are being reviewed. This usually takes 1–2 business days."
                : kycRecord.reviewNotes ?? "Please resubmit with correct information."}
            </p>
          </div>
        </div>
      )}

      {/* Profile */}
      <section className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center gap-3 p-5 border-b border-slate-100">
          <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
            <User size={16} className="text-slate-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Profile Information</h2>
            <p className="text-xs text-slate-500">Update your name and organization details</p>
          </div>
        </div>
        <div className="p-5">
          <ProfileEdit name={user.name} department={user.department} email={user.email} />
        </div>
      </section>

      {/* KYC Verification */}
      <section className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              user.isKycVerified ? "bg-green-100" : "bg-amber-100"
            }`}>
              {user.isKycVerified
                ? <CheckCircle2 size={16} className="text-green-600" />
                : <ShieldCheck size={16} className="text-amber-600" />}
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Identity Verification (KYC)</h2>
              <p className="text-xs text-slate-500">Required to submit payment requests</p>
            </div>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${kycStatusColor}`}>
            {kycStatusLabel}
          </span>
        </div>
        <div className="p-5">
          <KycForm existing={kycRecord ? {
            id: kycRecord.id,
            status: kycRecord.status,
            documentType: kycRecord.documentType,
            fullName: kycRecord.fullName ?? "",
            documentNumber: kycRecord.documentNumber,
            submittedAt: kycRecord.submittedAt.toISOString(),
            reviewNotes: kycRecord.reviewNotes,
            reviewedBy: kycRecord.reviewedBy,
            reviewedAt: kycRecord.reviewedAt?.toISOString() ?? null,
          } : null} />
        </div>
      </section>

      {/* Account Details */}
      <section className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center gap-3 p-5 border-b border-slate-100">
          <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
            <Lock size={16} className="text-slate-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Account Details</h2>
            <p className="text-xs text-slate-500">Account information and security</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 flex items-center gap-1 mb-1"><Mail size={11} /> Email</p>
              <p className="text-sm text-slate-900">{user.email}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 flex items-center gap-1 mb-1"><ShieldCheck size={11} /> Account Status</p>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                {user.status}
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-500 flex items-center gap-1 mb-1"><Clock size={11} /> Member Since</p>
              <p className="text-sm text-slate-900">
                {user.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 flex items-center gap-1 mb-1"><Clock size={11} /> Last Login</p>
              <p className="text-sm text-slate-900">
                {user.lastLoginAt
                  ? user.lastLoginAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                  : "—"}
              </p>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              To change your password or email, contact your portal administrator.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
