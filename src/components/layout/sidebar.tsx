"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  Settings,
  ShieldCheck,
  Building2,
  Inbox,
  BadgeCheck,
} from "lucide-react";
import type { Session } from "next-auth";
import { hasPermission } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    permission: null,
  },
  {
    href: "/deposits",
    label: "Deposits",
    icon: FileText,
    permission: "deposit:read" as const,
  },
  {
    href: "/reports",
    label: "Reports",
    icon: BarChart3,
    permission: "report:generate" as const,
  },
  {
    href: "/users",
    label: "Users",
    icon: Users,
    permission: "user:read" as const,
  },
  {
    href: "/admin/requests",
    label: "Client Requests",
    icon: Inbox,
    permission: "payment_request:view_all" as const,
  },
  {
    href: "/verifications",
    label: "Verifications",
    icon: BadgeCheck,
    permission: "kyc:review" as const,
  },
  {
    href: "/audit-logs",
    label: "Audit Logs",
    icon: ShieldCheck,
    permission: "admin:audit_logs" as const,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    permission: "admin:settings" as const,
  },
];

interface SidebarProps {
  session: Session;
}

export function Sidebar({ session }: SidebarProps) {
  const pathname = usePathname();
  const userRole = (session.user as any)?.role as UserRole;

  return (
    <div className="w-64 bg-slate-900 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Building2 size={16} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-sm">FD Portal</span>
            <p className="text-slate-400 text-xs">Deposit Management</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          // Permission check
          if (item.permission && !hasPermission(userRole, item.permission)) {
            return null;
          }

          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {session.user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {session.user?.name}
            </p>
            <p className="text-slate-400 text-xs truncate">
              {userRole?.replace(/_/g, " ")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
