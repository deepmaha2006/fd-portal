"use client";
import { signOut } from "next-auth/react";
import { LogOut, Bell } from "lucide-react";
import type { Session } from "next-auth";

export function PortalHeader({ session }: { session: Session }) {
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
      <div />
      <div className="flex items-center gap-3">
        <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors relative">
          <Bell size={18} />
        </button>
        <div className="h-5 w-px bg-slate-200" />
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </header>
  );
}
