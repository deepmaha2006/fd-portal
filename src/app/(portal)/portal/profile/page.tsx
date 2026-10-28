import { Metadata } from "next";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/permissions";
import { User, Building2, Mail, Shield } from "lucide-react";

export const metadata: Metadata = { title: "My Profile" };

export default async function ProfilePage() {
  const session = await getSession();
  const userId = getUserId(session!)!;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      department: true,
      status: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  if (!user) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="text-slate-500 text-sm mt-1">Your account information</p>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
            {user.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{user.name}</h2>
            <p className="text-slate-500 text-sm">{user.email}</p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-5">
          <div>
            <dt className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
              <Mail size={12} /> Email
            </dt>
            <dd className="text-sm text-slate-900">{user.email}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
              <Building2 size={12} /> Organization / Department
            </dt>
            <dd className="text-sm text-slate-900">{user.department ?? "—"}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
              <Shield size={12} /> Account status
            </dt>
            <dd>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                user.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
              }`}>
                {user.status === "ACTIVE" ? "Active" : user.status.replace(/_/g, " ")}
              </span>
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
              <User size={12} /> Member since
            </dt>
            <dd className="text-sm text-slate-900">
              {new Date(user.createdAt).toLocaleDateString("en-IN", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </dd>
          </div>
        </dl>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-800">
          To update your profile information or change your password, please contact your portal administrator.
        </p>
      </div>
    </div>
  );
}
