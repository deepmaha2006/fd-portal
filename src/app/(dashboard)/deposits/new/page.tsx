import { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { NewDepositForm } from "@/components/deposits/new-deposit-form";
import { ArrowLeft } from "lucide-react";
import type { UserRole } from "@prisma/client";

export const metadata: Metadata = { title: "New Deposit" };

export default async function NewDepositPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userRole = (session.user as any)?.role as UserRole;
  if (!hasPermission(userRole, "deposit:create")) redirect("/deposits");

  const [banks, departments, beneficiaries] = await Promise.all([
    prisma.bank.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.beneficiary.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link
          href="/deposits"
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-2"
        >
          <ArrowLeft size={14} /> Back to deposits
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">New Deposit</h1>
        <p className="text-slate-500 text-sm mt-1">
          Create a new security deposit or fixed deposit record
        </p>
      </div>

      <NewDepositForm
        banks={banks}
        departments={departments}
        beneficiaries={beneficiaries}
      />
    </div>
  );
}
