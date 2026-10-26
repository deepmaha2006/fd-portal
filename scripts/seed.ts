#!/usr/bin/env tsx
// Load .env before PrismaClient so DATABASE_URL is available (tsx doesn't auto-load .env)
import { config } from "dotenv";
config();

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { generateReferenceNumber } from "../src/lib/deposit-utils";

const prisma = new PrismaClient();

async function main() {
  console.log("[seed] Starting development seed...");

  // ── Banks ─────────────────────────────────────────────────────────────────
  const banks = await Promise.all([
    prisma.bank.upsert({
      where: { name: "State Bank of India" },
      update: {},
      create: { name: "State Bank of India", code: "SBI" },
    }),
    prisma.bank.upsert({
      where: { name: "HDFC Bank" },
      update: {},
      create: { name: "HDFC Bank", code: "HDFC" },
    }),
    prisma.bank.upsert({
      where: { name: "ICICI Bank" },
      update: {},
      create: { name: "ICICI Bank", code: "ICICI" },
    }),
    prisma.bank.upsert({
      where: { name: "Axis Bank" },
      update: {},
      create: { name: "Axis Bank", code: "AXIS" },
    }),
  ]);
  console.log("[seed] Banks created:", banks.length);

  // ── Departments ───────────────────────────────────────────────────────────
  const depts = await Promise.all([
    prisma.department.upsert({ where: { name: "Finance" }, update: {}, create: { name: "Finance", code: "FIN" } }),
    prisma.department.upsert({ where: { name: "Operations" }, update: {}, create: { name: "Operations", code: "OPS" } }),
    prisma.department.upsert({ where: { name: "Procurement" }, update: {}, create: { name: "Procurement", code: "PROC" } }),
    prisma.department.upsert({ where: { name: "Legal" }, update: {}, create: { name: "Legal", code: "LEG" } }),
  ]);
  console.log("[seed] Departments created:", depts.length);

  // ── Beneficiaries ─────────────────────────────────────────────────────────
  const beneficiaries = await Promise.all([
    prisma.beneficiary.upsert({ where: { id: "ben_1" }, update: {}, create: { id: "ben_1", name: "ABC Contractors Ltd", type: "vendor" } }),
    prisma.beneficiary.upsert({ where: { id: "ben_2" }, update: {}, create: { id: "ben_2", name: "XYZ Infrastructure", type: "contractor" } }),
    prisma.beneficiary.upsert({ where: { id: "ben_3" }, update: {}, create: { id: "ben_3", name: "Municipal Corporation", type: "government" } }),
  ]);
  console.log("[seed] Beneficiaries created:", beneficiaries.length);

  // ── Users ─────────────────────────────────────────────────────────────────
  const adminPassword = await hash("Admin@Password123!", 12);
  const managerPassword = await hash("Manager@Password123!", 12);

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@fdportal.dev";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "System Administrator",
      role: "SUPER_ADMIN",
      hashedPassword: adminPassword,
      status: "ACTIVE",
      department: "Finance",
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@fdportal.dev" },
    update: {},
    create: {
      email: "manager@fdportal.dev",
      name: "Finance Manager",
      role: "FINANCE_MANAGER",
      hashedPassword: managerPassword,
      status: "ACTIVE",
      department: "Finance",
    },
  });

  const officer = await prisma.user.upsert({
    where: { email: "officer@fdportal.dev" },
    update: {},
    create: {
      email: "officer@fdportal.dev",
      name: "Finance Officer",
      role: "FINANCE_OFFICER",
      hashedPassword: await hash("Officer@Password123!", 12),
      status: "ACTIVE",
      department: "Finance",
    },
  });

  console.log("[seed] Users created: admin, manager, officer");

  // ── Reminder Config ───────────────────────────────────────────────────────
  const reminderDays = [90, 60, 30, 15, 7, 1, 0];
  for (const days of reminderDays) {
    await prisma.reminderConfig.upsert({
      where: { daysBeforeEvent: days },
      update: {},
      create: { daysBeforeEvent: days, isEnabled: true },
    });
  }
  console.log("[seed] Reminder configs created");

  // ── Sample Deposits ───────────────────────────────────────────────────────
  const now = new Date();
  const deposits = [
    {
      id: "dep_1",
      refSeq: 1,
      type: "FIXED_DEPOSIT" as const,
      bankIdx: 0,
      deptIdx: 0,
      amount: 500000,
      rate: 7.5,
      issueOffset: -180,
      maturityOffset: 185,
      status: "ACTIVE" as const,
    },
    {
      id: "dep_2",
      refSeq: 2,
      type: "SECURITY_DEPOSIT" as const,
      bankIdx: 1,
      deptIdx: 2,
      amount: 200000,
      rate: null,
      issueOffset: -90,
      maturityOffset: 20,
      status: "MATURING_SOON" as const,
    },
    {
      id: "dep_3",
      refSeq: 3,
      type: "BANK_GUARANTEE" as const,
      bankIdx: 2,
      deptIdx: 1,
      amount: 1000000,
      rate: null,
      issueOffset: -365,
      maturityOffset: -5,
      status: "MATURED" as const,
    },
    {
      id: "dep_4",
      refSeq: 4,
      type: "FIXED_DEPOSIT" as const,
      bankIdx: 3,
      deptIdx: 3,
      amount: 750000,
      rate: 8.0,
      issueOffset: -30,
      maturityOffset: 335,
      status: "DRAFT" as const,
    },
    {
      id: "dep_5",
      refSeq: 5,
      type: "EARNEST_MONEY" as const,
      bankIdx: 0,
      deptIdx: 2,
      amount: 50000,
      rate: null,
      issueOffset: -60,
      maturityOffset: 5,
      status: "PENDING_REVIEW" as const,
    },
  ];

  for (const d of deposits) {
    const issueDate = new Date(now);
    issueDate.setDate(issueDate.getDate() + d.issueOffset);
    const maturityDate = new Date(now);
    maturityDate.setDate(maturityDate.getDate() + d.maturityOffset);

    await prisma.deposit.upsert({
      where: { id: d.id },
      update: {},
      create: {
        id: d.id,
        referenceNumber: generateReferenceNumber(d.refSeq),
        depositType: d.type,
        status: d.status,
        bankId: banks[d.bankIdx]?.id,
        departmentId: depts[d.deptIdx]?.id,
        beneficiaryId: beneficiaries[d.refSeq % beneficiaries.length]?.id ?? undefined,
        principalAmount: d.amount,
        currency: "INR",
        interestRate: d.rate,
        issueDate,
        maturityDate,
        createdById: officer.id,
        ownerId: manager.id,
        notes: `Synthetic seed deposit ${d.refSeq} — development only`,
      },
    });
  }

  console.log("[seed] Sample deposits created:", deposits.length);
  console.log("[seed] ──────────────────────────────────────────");
  console.log("[seed] Development credentials:");
  console.log(`[seed]   Admin:   ${adminEmail} / Admin@Password123!`);
  console.log("[seed]   Manager: manager@fdportal.dev / Manager@Password123!");
  console.log("[seed]   Officer: officer@fdportal.dev / Officer@Password123!");
  console.log("[seed] ⚠️  NEVER use these credentials in production.");
  console.log("[seed] Seed complete.");
}

main()
  .catch((e) => {
    console.error("[seed] Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
