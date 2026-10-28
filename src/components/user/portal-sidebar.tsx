"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  Settings,
  Building2,
} from "lucide-react";
import type { Session } from "next-auth";

const navItems = [
  { href: "/portal", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/portal/requests", label: "My Requests", icon: ClipboardList, exact: false },
  { href: "/portal/requests/new", label: "New Request", icon: PlusCircle, exact: true },
  { href: "/portal/settings", label: "Settings", icon: Settings, exact: false },
];

interface PortalSidebarProps {
  session: Session;
}

export function PortalSidebar({ session }: PortalSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="w-60 bg-slate-900 flex flex-col">
      <div className="p-5 border-b border-slate-700">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Building2 size={16} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-sm">FD Portal</span>
            <p className="text-slate-400 text-xs">Client Portal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href) && !(item.href === "/portal/requests" && pathname === "/portal/requests/new");

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

      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {session.user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{session.user?.name}</p>
            <p className="text-slate-400 text-xs">Client</p>
          </div>
        </div>
      </div>
    </div>
  );
}
