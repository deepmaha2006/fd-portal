import {
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle,
  DollarSign,
  AlertCircle,
  Inbox,
} from "lucide-react";

interface DashboardSummary {
  totalActive: number;
  totalPrincipal: number;
  expiringIn30: number;
  expiringIn90: number;
  overdue: number;
  pendingApproval: number;
  pendingClientRequests: number;
}

export function DashboardStats({ summary }: { summary: DashboardSummary }) {
  const stats = [
    {
      title: "Active Deposits",
      value: summary.totalActive.toLocaleString(),
      icon: CheckCircle,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      description: "Currently active",
      href: "/deposits?status=ACTIVE",
    },
    {
      title: "Total Principal",
      value: new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(summary.totalPrincipal),
      icon: DollarSign,
      color: "text-blue-600",
      bg: "bg-blue-50",
      description: "Active deposits value",
      href: "/deposits",
    },
    {
      title: "Client Requests",
      value: summary.pendingClientRequests.toLocaleString(),
      icon: Inbox,
      color: summary.pendingClientRequests > 0 ? "text-violet-600" : "text-slate-400",
      bg: summary.pendingClientRequests > 0 ? "bg-violet-50" : "bg-slate-50",
      description: "Awaiting review",
      href: "/admin/requests?status=SUBMITTED",
    },
    {
      title: "Pending Approval",
      value: summary.pendingApproval.toLocaleString(),
      icon: AlertCircle,
      color: summary.pendingApproval > 0 ? "text-orange-600" : "text-slate-400",
      bg: summary.pendingApproval > 0 ? "bg-orange-50" : "bg-slate-50",
      description: "Deposits awaiting approval",
      href: "/deposits?status=PENDING_REVIEW",
    },
    {
      title: "Expiring in 30 Days",
      value: summary.expiringIn30.toLocaleString(),
      icon: Clock,
      color: summary.expiringIn30 > 0 ? "text-amber-600" : "text-slate-400",
      bg: summary.expiringIn30 > 0 ? "bg-amber-50" : "bg-slate-50",
      description: "Require action",
      href: "/deposits",
    },
    {
      title: "Overdue",
      value: summary.overdue.toLocaleString(),
      icon: AlertTriangle,
      color: summary.overdue > 0 ? "text-red-600" : "text-slate-400",
      bg: summary.overdue > 0 ? "bg-red-50" : "bg-slate-50",
      description: "Past maturity date",
      href: "/deposits",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {stats.map((stat) => (
        <a
          key={stat.title}
          href={stat.href}
          className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-sm transition-all"
        >
          <div className={`inline-flex p-2 rounded-lg ${stat.bg} mb-3`}>
            <stat.icon size={18} className={stat.color} />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
          <p className="text-sm font-medium text-slate-700 mt-0.5">{stat.title}</p>
          <p className="text-xs text-slate-400 mt-0.5">{stat.description}</p>
        </a>
      ))}
    </div>
  );
}
