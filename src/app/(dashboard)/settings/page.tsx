import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { hasPermission, getUserId } from "@/lib/permissions";
import {
  User, Shield, Bell, ShieldCheck, Users, Settings2,
  CheckCircle2, Clock, XCircle, Building2, Mail, Lock,
} from "lucide-react";
import type { UserRole } from "@prisma/client";

export const metadata: Metadata = { title: "Settings" };

const ROLE_LABELS: Partial<Record<UserRole, string>> = {
  SUPER_ADMIN: "Super Administrator",
  ADMIN: "Administrator",
  FINANCE_MANAGER: "Finance Manager",
  FINANCE_OFFICER: "Finance Officer",
  AUDITOR: "Auditor",
  VIEWER: "Viewer",
};

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userId = getUserId(session)!;
  const role = (session.user as any)?.role as UserRole;

  const canManageKyc = hasPermission(role, "kyc:review");
  const canManageUsers = hasPermission(role, "user:manage");
  const canManageSystem = role === "SUPER_ADMIN" || role === "ADMIN";

  const [user, kycCounts, userCounts, reminderConfigs, appSettings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, department: true, role: true, status: true, createdAt: true, lastLoginAt: true },
    }),
    canManageKyc
      ? prisma.kycVerification.groupBy({ by: ["status"], _count: true })
      : Promise.resolve([]),
    canManageUsers
      ? prisma.user.groupBy({ by: ["status"], _count: true })
      : Promise.resolve([]),
    canManageSystem
      ? prisma.reminderConfig.findMany({ orderBy: { daysBeforeEvent: "desc" } })
      : Promise.resolve([]),
    role === "SUPER_ADMIN"
      ? prisma.appSetting.findMany({ orderBy: { key: "asc" } })
      : Promise.resolve([]),
  ]);

  if (!user) redirect("/login");

  const kycCountMap = Object.fromEntries((kycCounts as any[]).map((c: any) => [c.status, c._count]));
  const pendingKyc = kycCountMap["PENDING_REVIEW"] ?? 0;
  const userCountMap = Object.fromEntries((userCounts as any[]).map((c: any) => [c.status, c._count]));
  const activeUsers = userCountMap["ACTIVE"] ?? 0;
  const pendingUsers = userCountMap["PENDING_VERIFICATION"] ?? 0;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your account and system configuration</p>
      </div>

      {/* ── Profile ─────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
          <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
            <User size={16} className="text-slate-600" />
          </div>
          <h2 className="font-semibold text-slate-900">Profile</h2>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold select-none">
              {user.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-lg">{user.name}</p>
              <p className="text-sm text-slate-500">{ROLE_LABELS[user.role] ?? user.role}</p>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-5 text-sm">
            <div>
              <dt className="flex items-center gap-1 text-xs text-slate-500 mb-1"><Mail size={11} /> Email</dt>
              <dd className="text-slate-900">{user.email}</dd>
            </div>
            {user.department && (
              <div>
                <dt className="flex items-center gap-1 text-xs text-slate-500 mb-1"><Building2 size={11} /> Department</dt>
                <dd className="text-slate-900">{user.department}</dd>
              </div>
            )}
            <div>
              <dt className="flex items-center gap-1 text-xs text-slate-500 mb-1"><Lock size={11} /> Account Status</dt>
              <dd><span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">{user.status}</span></dd>
            </div>
            <div>
              <dt className="flex items-center gap-1 text-xs text-slate-500 mb-1"><Clock size={11} /> Member Since</dt>
              <dd className="text-slate-900">{user.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</dd>
            </div>
          </dl>
          <p className="mt-5 text-xs text-slate-400 border-t border-slate-100 pt-4">
            To update your name or password, contact a Super Administrator.
          </p>
        </div>
      </section>

      {/* ── KYC Verification Queue (ADMIN+) ─────────────── */}
      {canManageKyc && (
        <section className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
                <ShieldCheck size={16} className="text-amber-600" />
              </div>
              <h2 className="font-semibold text-slate-900">KYC Verification Queue</h2>
            </div>
            {pendingKyc > 0 && (
              <span className="text-xs font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full">{pendingKyc} pending</span>
            )}
          </div>
          <div className="p-6">
            <div className="grid grid-cols-3 gap-4 mb-5">
              {[
                { label: "Pending Review", count: kycCountMap["PENDING_REVIEW"] ?? 0, icon: Clock, color: "text-amber-600 bg-amber-50" },
                { label: "Approved", count: kycCountMap["APPROVED"] ?? 0, icon: CheckCircle2, color: "text-green-600 bg-green-50" },
                { label: "Rejected", count: kycCountMap["REJECTED"] ?? 0, icon: XCircle, color: "text-red-600 bg-red-50" },
              ].map((s) => (
                <div key={s.label} className={`rounded-xl px-4 py-3 flex items-center gap-3 ${s.color.split(" ")[1]}`}>
                  <s.icon size={18} className={s.color.split(" ")[0]} />
                  <div>
                    <p className="text-lg font-bold text-slate-900">{s.count}</p>
                    <p className="text-xs text-slate-500">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
            <a
              href="/verifications"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <ShieldCheck size={14} />
              {pendingKyc > 0 ? `Review ${pendingKyc} pending verification${pendingKyc > 1 ? "s" : ""} →` : "View all verifications →"}
            </a>
          </div>
        </section>
      )}

      {/* ── User Management (ADMIN+) ─────────────────────── */}
      {canManageUsers && (
        <section className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users size={16} className="text-blue-600" />
            </div>
            <h2 className="font-semibold text-slate-900">User Management</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-5">
              {[
                { label: "Active Users", count: activeUsers, color: "bg-green-50 text-green-700" },
                { label: "Pending Activation", count: pendingUsers, color: "bg-amber-50 text-amber-700" },
              ].map((s) => (
                <div key={s.label} className={`rounded-xl px-4 py-3 ${s.color}`}>
                  <p className="text-2xl font-bold">{s.count}</p>
                  <p className="text-xs mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <a href="/users" className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700">
                <Users size={14} /> Manage Users →
              </a>
              {role === "SUPER_ADMIN" && (
                <span className="text-slate-300">·</span>
              )}
              {role === "SUPER_ADMIN" && (
                <a href="/users?action=create" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-700">
                  Create Staff Account →
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Deposit & Expense Tracking (ADMIN+) ─────────── */}
      {canManageSystem && (
        <section className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
            <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
              <Bell size={16} className="text-green-600" />
            </div>
            <h2 className="font-semibold text-slate-900">Maturity Reminder Schedule</h2>
          </div>
          <div className="p-6">
            {reminderConfigs.length === 0 ? (
              <p className="text-sm text-slate-400">No reminder schedules configured.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {reminderConfigs.map((rc) => (
                  <div key={rc.id} className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-slate-700">
                      {rc.daysBeforeEvent === 0 ? "On maturity date" : `${rc.daysBeforeEvent} days before maturity`}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${rc.isEnabled ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                      {rc.isEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── System Configuration (SUPER_ADMIN) ──────────── */}
      {role === "SUPER_ADMIN" && (
        <section className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
            <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
              <Settings2 size={16} className="text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">System Configuration</h2>
              <p className="text-xs text-slate-400">Visible to Super Administrators only</p>
            </div>
          </div>
          <div className="p-6">
            {appSettings.length === 0 ? (
              <p className="text-sm text-slate-400">No application settings in the database yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {appSettings.map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-3">
                    <span className="text-sm text-slate-700 font-medium">{s.key}</span>
                    <code className="text-xs font-mono bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">{s.value}</code>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-4 text-xs text-slate-400">To modify settings, update via database or the management API.</p>
          </div>
        </section>
      )}

      {/* ── Security & Access ────────────────────────────── */}
      <section className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
          <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
            <Shield size={16} className="text-red-500" />
          </div>
          <h2 className="font-semibold text-slate-900">Security</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-900">Password</p>
              <p className="text-xs text-slate-500 mt-0.5">Last changed: unknown</p>
            </div>
            {role === "SUPER_ADMIN" ? (
              <a href="/users?action=password" className="text-xs font-medium text-blue-600 hover:underline">
                Manage passwords →
              </a>
            ) : (
              <p className="text-xs text-slate-400">Contact your admin to change your password.</p>
            )}
          </div>
          {role === "SUPER_ADMIN" && (
            <div className="flex items-start justify-between gap-4 pt-3 border-t border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-900">Audit Logs</p>
                <p className="text-xs text-slate-500 mt-0.5">Review all system activity</p>
              </div>
              <a href="/audit-logs" className="text-xs font-medium text-blue-600 hover:underline">View Logs →</a>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
