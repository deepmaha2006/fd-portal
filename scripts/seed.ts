#!/usr/bin/env tsx
// Load .env before PrismaClient so DATABASE_URL is available (tsx doesn't auto-load .env)
import { config } from "dotenv";
config();

if (process.env.NODE_ENV === "production") {
  throw new Error("Seed script must not run in production. Set NODE_ENV != production to proceed.");
}

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
  const adminEmail    = process.env.SEED_ADMIN_EMAIL    ?? "admin@fdportal.dev";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin@FDP2026!";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { hashedPassword: await hash(adminPassword, 12), status: "ACTIVE" },
    create: {
      email: adminEmail,
      name: "Super Administrator",
      role: "SUPER_ADMIN",
      hashedPassword: await hash(adminPassword, 12),
      status: "ACTIVE",
      department: "Finance",
    },
  });

  const sysadmin = await prisma.user.upsert({
    where: { email: "sysadmin@fdportal.dev" },
    update: { hashedPassword: await hash("Sysadmin@FDP2026!", 12), status: "ACTIVE" },
    create: {
      email: "sysadmin@fdportal.dev",
      name: "System Admin",
      role: "ADMIN",
      hashedPassword: await hash("Sysadmin@FDP2026!", 12),
      status: "ACTIVE",
      department: "Finance",
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "finmanager@fdportal.dev" },
    update: { hashedPassword: await hash("FinMgr@FDP2026!", 12), status: "ACTIVE" },
    create: {
      email: "finmanager@fdportal.dev",
      name: "Finance Manager",
      role: "FINANCE_MANAGER",
      hashedPassword: await hash("FinMgr@FDP2026!", 12),
      status: "ACTIVE",
      department: "Finance",
    },
  });

  const officer = await prisma.user.upsert({
    where: { email: "finofficer@fdportal.dev" },
    update: { hashedPassword: await hash("FinOff@FDP2026!", 12), status: "ACTIVE" },
    create: {
      email: "finofficer@fdportal.dev",
      name: "Finance Officer",
      role: "FINANCE_OFFICER",
      hashedPassword: await hash("FinOff@FDP2026!", 12),
      status: "ACTIVE",
      department: "Finance",
    },
  });

  const auditor = await prisma.user.upsert({
    where: { email: "auditor@fdportal.dev" },
    update: { hashedPassword: await hash("Auditor@FDP2026!", 12), status: "ACTIVE" },
    create: {
      email: "auditor@fdportal.dev",
      name: "Auditor",
      role: "AUDITOR",
      hashedPassword: await hash("Auditor@FDP2026!", 12),
      status: "ACTIVE",
      department: "Finance",
    },
  });

  const viewer = await prisma.user.upsert({
    where: { email: "viewer@fdportal.dev" },
    update: { hashedPassword: await hash("Viewer@FDP2026!", 12), status: "ACTIVE" },
    create: {
      email: "viewer@fdportal.dev",
      name: "Viewer",
      role: "VIEWER",
      hashedPassword: await hash("Viewer@FDP2026!", 12),
      status: "ACTIVE",
      department: "Finance",
    },
  });

  const client = await prisma.user.upsert({
    where: { email: "client@fdportal.dev" },
    update: { hashedPassword: await hash("Client@FDP2026!", 12), status: "ACTIVE" },
    create: {
      email: "client@fdportal.dev",
      name: "Demo Client",
      role: "CLIENT",
      hashedPassword: await hash("Client@FDP2026!", 12),
      status: "ACTIVE",
      department: "Finance",
    },
  });

  console.log("[seed] Users created: super_admin, admin, finance_manager, finance_officer, auditor, viewer, client");

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
  console.log("[seed] Portal credentials (development only):");
  console.log(`[seed]   SUPER_ADMIN:     ${adminEmail} / ${adminPassword}`);
  console.log("[seed]   ADMIN:          sysadmin@fdportal.dev / Sysadmin@FDP2026!");
  console.log("[seed]   FINANCE_MANAGER: finmanager@fdportal.dev / FinMgr@FDP2026!");
  console.log("[seed]   FINANCE_OFFICER: finofficer@fdportal.dev / FinOff@FDP2026!");
  console.log("[seed]   AUDITOR:        auditor@fdportal.dev / Auditor@FDP2026!");
  console.log("[seed]   VIEWER:         viewer@fdportal.dev / Viewer@FDP2026!");
  console.log("[seed]   CLIENT:         client@fdportal.dev / Client@FDP2026!");
  console.log("[seed] ⚠️  NEVER use these credentials in production.");
  console.log("[seed] Seed complete.");
}

main()
  .catch((e) => {
    console.error("[seed] Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
