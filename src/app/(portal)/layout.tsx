import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { PortalSidebar } from "@/components/user/portal-sidebar";
import { PortalHeader } from "@/components/layout/portal-header";
import type { UserRole } from "@prisma/client";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const role = (session.user as any)?.role as UserRole;

  // Only CLIENT role accesses the portal; others go to the admin dashboard
  if (role !== "CLIENT") redirect("/dashboard");

  return (
    <div className="flex h-screen bg-slate-50">
      <PortalSidebar session={session} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <PortalHeader session={session} />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
