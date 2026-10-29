import { formatDateTime } from "@/lib/deposit-utils";
import type { DepositStatus } from "@prisma/client";

interface Event {
  id: string;
  fromStatus: DepositStatus | null;
  toStatus: DepositStatus;
  notes: string | null;
  occurredAt: Date;
}

const STATUS_ICONS: Partial<Record<DepositStatus, string>> = {
  DRAFT: "○",
  PENDING_REVIEW: "⏳",
  APPROVED: "✓",
  ACTIVE: "▶",
  MATURED: "★",
  RENEWED: "↻",
  RELEASED: "✓",
  CANCELLED: "✗",
  ARCHIVED: "■",
};

export function LifecycleTimeline({ events }: { events: Event[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h2 className="font-semibold text-slate-900 mb-4">History</h2>
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-100" />
        <div className="space-y-4">
          {events.map((e) => (
            <div key={e.id} className="flex items-start gap-4 relative">
              <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center flex-shrink-0 z-10 text-xs">
                {STATUS_ICONS[e.toStatus] ?? "•"}
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-900">
                    {e.fromStatus
                      ? `${e.fromStatus.replace(/_/g, " ")} → ${e.toStatus.replace(/_/g, " ")}`
                      : e.toStatus.replace(/_/g, " ")}
                  </p>
                  <time className="text-xs text-slate-400">
                    {formatDateTime(e.occurredAt)}
                  </time>
                </div>
                {e.notes && (
                  <p className="text-xs text-slate-500 mt-0.5">{e.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}