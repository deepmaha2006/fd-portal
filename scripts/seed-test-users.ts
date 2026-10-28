#!/usr/bin/env tsx
/**
 * Seed / reset all test user accounts.
 * Safe to run repeatedly — upserts by email, does NOT delete existing data.
 *
 * Usage:
 *   npx tsx scripts/seed-test-users.ts
 */
import { config } from "dotenv";
config();

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const TEST_USERS = [
  { email: "admin@fdportal.dev",      name: "Super Administrator", role: "SUPER_ADMIN",     password: "Admin@FDP2026!",    department: "Finance" },
  { email: "sysadmin@fdportal.dev",   name: "System Admin",        role: "ADMIN",            password: "Sysadmin@FDP2026!", department: "IT" },
  { email: "finmanager@fdportal.dev", name: "Finance Manager",     role: "FINANCE_MANAGER",  password: "FinMgr@FDP2026!",   department: "Finance" },
  { email: "finofficer@fdportal.dev", name: "Finance Officer",     role: "FINANCE_OFFICER",  password: "FinOff@FDP2026!",   department: "Finance" },
  { email: "auditor@fdportal.dev",    name: "Internal Auditor",    role: "AUDITOR",           password: "Auditor@FDP2026!",  department: "Audit" },
  { email: "viewer@fdportal.dev",     name: "Report Viewer",       role: "VIEWER",            password: "Viewer@FDP2026!",   department: "Operations" },
  { email: "client@fdportal.dev",     name: "Test Client",         role: "CLIENT",            password: "Client@FDP2026!",   department: "Acme Corp" },
] as const;

async function main() {
  console.log("[seed] Creating / resetting test users...\n");

  for (const u of TEST_USERS) {
    const hashed = await hash(u.password, 12);

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role as any,
        hashedPassword: hashed,
        status: "ACTIVE",
        lockedUntil: null,
        failedLoginAttempts: 0,
        mfaEnabled: false,
        mfaSecret: null,
        tokenVersion: { increment: 1 },
        // KYC-verify the client so they can submit payment requests
        isKycVerified: u.role === "CLIENT" ? true : undefined,
      },
      create: {
        email: u.email,
        name: u.name,
        role: u.role as any,
        hashedPassword: hashed,
        status: "ACTIVE",
        department: u.department,
        isKycVerified: u.role === "CLIENT",
      },
    });

    const pad = (s: string, n: number) => s.padEnd(n);
    console.log(`  ✓  ${pad(user.role, 16)}  ${pad(user.email, 28)}  ${u.password}`);
  }

  console.log("\n[seed] Done. All accounts are active, unlocked, MFA disabled.");
}

main()
  .catch((e) => { console.error("[seed] Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
