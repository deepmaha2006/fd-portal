import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

export const metadata: Metadata = { title: "Audit Logs" };

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const role = (session.user as any)?.role as UserRole;
  if (!hasPermission(role, "audit:read")) redirect("/dashboard");

  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const pageSize = 50;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { occurredAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        actor: { select: { name: true, email: true } },
      },
    }),
    prisma.auditLog.count(),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  const actionColor: Record<string, string> = {
    DEPOSIT_CREATED: "bg-green-100 text-green-700",
    DEPOSIT_UPDATED: "bg-blue-100 text-blue-700",
    DEPOSIT_DELETED: "bg-red-100 text-red-700",
    USER_LOGIN: "bg-purple-100 text-purple-700",
    USER_LOGOUT: "bg-slate-100 text-slate-600",
    DEPOSIT_STATUS_CHANGED: "bg-emerald-100 text-emerald-700",
    DEPOSIT_EXPORTED: "bg-yellow-100 text-yellow-700",
    DOCUMENT_DOWNLOADED: "bg-cyan-100 text-cyan-700",
    USER_LOGIN_FAILED: "bg-red-100 text-red-700",
    USER_LOCKED: "bg-red-200 text-red-800",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
        <p className="text-slate-500 text-sm mt-1">
          {total.toLocaleString()} total events · Page {page} of {totalPages}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-xs text-slate-500 uppercase tracking-wide">
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">IP Address</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                  {new Date(log.occurredAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                </td>
                <td className="px-4 py-3">
                  <div className="text-slate-800 font-medium text-xs">{log.actor?.name ?? "System"}</div>
                  <div className="text-slate-400 text-xs">{log.actorEmail ?? log.actor?.email ?? "—"}</div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      actionColor[log.action] ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {log.action.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600 text-xs">
                  <div>{log.targetType}</div>
                  {log.targetId && (
                    <div className="text-slate-400 font-mono text-[10px]">{log.targetId.slice(0, 8)}…</div>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs font-mono">{log.ipAddress ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">
                  {log.outcome ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <div className="text-center py-12 text-slate-500 text-sm">No audit logs found.</div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex gap-2 justify-center">
          {page > 1 && (
            <a
              href={`?page=${page - 1}`}
              className="px-3 py-1.5 border border-slate-300 rounded text-sm text-slate-700 hover:bg-slate-50"
            >
              Previous
            </a>
          )}
          <span className="px-3 py-1.5 text-sm text-slate-500">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <a
              href={`?page=${page + 1}`}
              className="px-3 py-1.5 border border-slate-300 rounded text-sm text-slate-700 hover:bg-slate-50"
            >
              Next
            </a>
          )}
        </div>
      )}
    </div>
  );
}
