import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/permissions";
import { PortalSidebar } from "@/components/user/portal-sidebar";
import { PortalHeader } from "@/components/layout/portal-header";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { UserRole } from "@prisma/client";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const role = (session.user as any)?.role as UserRole;
  if (role !== "CLIENT") redirect("/dashboard");

  const userId = getUserId(session)!;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isKycVerified: true },
  }).catch(() => null);

  const showKycBanner = !user?.isKycVerified;

  return (
    <div className="flex h-screen bg-slate-50">
      <PortalSidebar session={session} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <PortalHeader session={session} />
        {showKycBanner && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center gap-3">
            <ShieldCheck size={15} className="text-amber-600 flex-shrink-0" />
            <p className="text-amber-800 text-sm flex-1">
              <strong>Identity verification required</strong> — complete KYC to enable payment requests.
            </p>
            <Link
              href="/portal/settings"
              className="text-xs font-medium text-amber-700 hover:text-amber-900 underline whitespace-nowrap"
            >
              Verify now →
            </Link>
          </div>
        )}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
