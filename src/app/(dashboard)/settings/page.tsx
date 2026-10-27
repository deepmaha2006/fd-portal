import { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = (session.user as any)?.role as UserRole;
  if (!hasPermission(role, "settings:manage")) redirect("/dashboard");

  const reminderConfigs = await prisma.reminderConfig.findMany({
    orderBy: { daysBeforeEvent: "desc" },
  });

  const appSettings = await prisma.appSetting.findMany({
    orderBy: { key: "asc" },
  });

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">System configuration and reminder settings</p>
      </div>

      {/* Reminder Config */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-1">Maturity Reminder Schedule</h2>
        <p className="text-sm text-slate-500 mb-4">
          Email reminders are sent to deposit owners at these intervals before maturity.
        </p>
        <div className="space-y-2">
          {reminderConfigs.map((rc) => (
            <div key={rc.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <span className="text-sm text-slate-700">
                {rc.daysBeforeEvent === 0
                  ? "On maturity date"
                  : `${rc.daysBeforeEvent} days before maturity`}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  rc.isEnabled ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {rc.isEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* App Settings */}
      {appSettings.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Application Settings</h2>
          <div className="space-y-3">
            {appSettings.map((s) => (
              <div key={s.id} className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-700">{s.key}</div>
                </div>
                <div className="font-mono text-sm text-slate-600 bg-slate-50 px-2 py-1 rounded">
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="text-xs text-slate-400">
        To modify reminder intervals or application settings, update the database directly or use the API.
      </p>
    </div>
  );
}
