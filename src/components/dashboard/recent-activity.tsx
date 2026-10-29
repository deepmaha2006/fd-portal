import Link from "next/link";
import { formatDateTime } from "@/lib/deposit-utils";
import { Activity } from "lucide-react";
import type { DepositStatus } from "@prisma/client";

interface ActivityEvent {
  id: string;
  fromStatus: DepositStatus | null;
  toStatus: DepositStatus;
  notes: string | null;
  occurredAt: Date;
  deposit: {
    id: string;
    referenceNumber: string;
    depositType: string;
  } | null;
}

const STATUS_LABELS: Partial<Record<DepositStatus, string>> = {
  DRAFT: "created as draft",
  PENDING_REVIEW: "submitted for review",
  APPROVED: "approved",
  ACTIVE: "activated",
  MATURING_SOON: "flagged as maturing soon",
  MATURED: "matured",
  RENEWAL_PENDING: "renewal requested",
  RENEWED: "renewed",
  RELEASE_PENDING: "release requested",
  RELEASED: "released",
  CANCELLED: "cancelled",
  ARCHIVED: "archived",
};

export function RecentActivity({ events }: { events: ActivityEvent[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="p-5 border-b border-slate-100">
        <h2 className="font-semibold text-slate-900">Recent Activity</h2>
      </div>
      {events.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          <Activity size={32} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm">No activity yet</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {events.map((e) => (
            <div key={e.id} className="flex items-start gap-4 p-4 hover:bg-slate-50">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Activity size={14} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700">
                  Deposit{" "}
                  {e.deposit ? (
                    <Link
                      href={`/deposits/${e.deposit.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {e.deposit.referenceNumber}
                    </Link>
                  ) : (
                    "unknown"
                  )}{" "}
                  {STATUS_LABELS[e.toStatus] ?? e.toStatus}
                </p>
                {e.notes && (
                  <p className="text-xs text-slate-500 mt-0.5">{e.notes}</p>
                )}
              </div>
              <time
                dateTime={e.occurredAt.toISOString()}
                className="text-xs text-slate-400 flex-shrink-0"
              >
                {formatDateTime(e.occurredAt)}
              </time>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}