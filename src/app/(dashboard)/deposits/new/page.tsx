import { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { CreateDepositForm } from "@/components/deposits/create-deposit-form";
import type { UserRole } from "@prisma/client";

export const metadata: Metadata = { title: "New Deposit" };

export default async function NewDepositPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userRole = (session.user as any)?.role as UserRole;
  if (!hasPermission(userRole, "deposit:create")) redirect("/deposits");

  const [banks, beneficiaries] = await Promise.all([
    prisma.bank.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        branches: { select: { id: true, name: true }, orderBy: { name: "asc" } },
      },
    }),
    prisma.beneficiary.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true },
    }),
  ]);

  return (
    <Suspense>
      <CreateDepositForm banks={banks} beneficiaries={beneficiaries} />
    </Suspense>
  );
}
