import { formatCurrency } from "@/lib/deposit-utils";

interface StatusEntry {
  status: string;
  count: number;
  totalPrincipal: number;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-500",
  APPROVED: "bg-blue-500",
  MATURING_SOON: "bg-amber-500",
  MATURED: "bg-orange-500",
  PENDING_REVIEW: "bg-yellow-500",
  RENEWAL_PENDING: "bg-indigo-500",
  RELEASE_PENDING: "bg-purple-500",
  DRAFT: "bg-slate-400",
  RENEWED: "bg-cyan-500",
  RELEASED: "bg-green-400",
  CANCELLED: "bg-red-400",
  ARCHIVED: "bg-slate-300",
};

export function StatusBreakdown({ breakdown }: { breakdown: StatusEntry[] }) {
  const total = breakdown.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="p-5 border-b border-slate-100">
        <h2 className="font-semibold text-slate-900">Status Breakdown</h2>
      </div>
      <div className="p-4 space-y-3">
        {breakdown
          .sort((a, b) => b.count - a.count)
          .map((s) => (
            <div key={s.status} className="flex items-center gap-3">
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  STATUS_COLORS[s.status] ?? "bg-slate-400"
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700">
                    {s.status.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-slate-500">{s.count}</span>
                </div>
                <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      STATUS_COLORS[s.status] ?? "bg-slate-400"
                    }`}
                    style={{ width: total > 0 ? `${(s.count / total) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            </div>
          ))}
        {breakdown.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">No deposits yet</p>
        )}
      </div>
    </div>
  );
}
