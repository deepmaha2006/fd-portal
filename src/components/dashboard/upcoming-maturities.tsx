import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import { AlertTriangle, Clock, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/deposit-utils";
interface Deposit {
  id: string;
  referenceNumber: string;
  depositType: string;
  principalAmount: number;
  currency: string;
  maturityDate: Date | null;
  status: string;
  bank: { name: string } | null;
}

export function UpcomingMaturities({ deposits }: { deposits: Deposit[] }) {
  const now = new Date();

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="flex items-center justify-between p-5 border-b border-slate-100">
        <h2 className="font-semibold text-slate-900">Upcoming Maturities</h2>
        <Link
          href="/deposits?sortBy=maturityDate&sortOrder=asc"
          className="text-blue-600 text-sm flex items-center gap-1 hover:underline"
        >
          View all <ArrowRight size={14} />
        </Link>
      </div>

      {deposits.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          <Clock size={32} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm">No deposits maturing in the next 90 days</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {deposits.map((d) => {
            const days = d.maturityDate
              ? differenceInDays(d.maturityDate, now)
              : null;
            const isUrgent = days !== null && days <= 15;
            const isWarning = days !== null && days > 15 && days <= 30;

            return (
              <div key={d.id} className="flex items-center gap-4 p-4 hover:bg-slate-50">
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    isUrgent
                      ? "bg-red-500"
                      : isWarning
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/deposits/${d.id}`}
                      className="font-medium text-slate-900 text-sm hover:text-blue-600 truncate"
                    >
                      {d.referenceNumber}
                    </Link>
                    {isUrgent && (
                      <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                        <AlertTriangle size={10} /> Urgent
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {d.bank?.name ?? "—"} · {d.depositType.replace(/_/g, " ")}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-slate-900">
                    {formatCurrency(d.principalAmount, d.currency)}
                  </p>
                  <p
                    className={`text-xs ${
                      isUrgent
                        ? "text-red-600 font-semibold"
                        : isWarning
                          ? "text-amber-600"
                          : "text-slate-500"
                    }`}
                  >
                    {days !== null
                      ? days === 0
                        ? "Matures today"
                        : `${days} day${days === 1 ? "" : "s"}`
                      : "—"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
