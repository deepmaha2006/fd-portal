import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { decryptField } from "@/lib/field-encrypt";
import { EditDepositForm } from "@/components/deposits/edit-deposit-form";
import type { UserRole } from "@prisma/client";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const deposit = await prisma.deposit.findUnique({
    where: { id: params.id },
    select: { referenceNumber: true },
  });
  return { title: `Edit ${deposit?.referenceNumber ?? "Deposit"}` };
}

export default async function EditDepositPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userRole = (session.user as any)?.role as UserRole;
  if (!hasPermission(userRole, "deposit:update")) redirect("/deposits");

  const [deposit, banks, beneficiaries] = await Promise.all([
    prisma.deposit.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        referenceNumber: true,
        certificateNumber: true,
        bankId: true,
        branchId: true,
        accountNumber: true,
        beneficiaryId: true,
        issuingOrganization: true,
        vendorReference: true,
        contractNumber: true,
        principalAmount: true,
        currency: true,
        interestRate: true,
        issueDate: true,
        maturityDate: true,
        expiryDate: true,
        isRenewalEligible: true,
        notes: true,
        status: true,
      },
    }),
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

  if (!deposit) notFound();

  // Block editing terminal-status deposits (API enforces this too, but fail fast)
  if (["RELEASED", "CANCELLED", "ARCHIVED", "RENEWED"].includes(deposit.status)) {
    redirect(`/deposits/${params.id}`);
  }

  return (
    <EditDepositForm
      deposit={{
        ...deposit,
        principalAmount: Number(deposit.principalAmount),
        interestRate: deposit.interestRate != null ? Number(deposit.interestRate) : null,
        issueDate: deposit.issueDate.toISOString(),
        maturityDate: deposit.maturityDate?.toISOString() ?? null,
        expiryDate: deposit.expiryDate?.toISOString() ?? null,
        accountNumber: decryptField(deposit.accountNumber),
      }}
      banks={banks}
      beneficiaries={beneficiaries}
    />
  );
}
