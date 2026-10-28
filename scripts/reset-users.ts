#!/usr/bin/env tsx
/**
 * reset-users.ts
 *
 * Deletes ALL existing users from the database and re-creates exactly one
 * canonical account per RBAC role.  Run this to wipe stale/test accounts.
 *
 * Usage:
 *   npx tsx scripts/reset-users.ts
 *
 * ⚠️  DESTRUCTIVE — only run against a dev/staging instance.
 */
import { config } from "dotenv";
config();

if (process.env.NODE_ENV === "production") {
  throw new Error("reset-users must not run in production.");
}

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const USERS = [
  {
    email: process.env.SEED_ADMIN_EMAIL ?? "admin@fdportal.dev",
    name: "Super Administrator",
    role: "SUPER_ADMIN" as const,
    password: process.env.SEED_ADMIN_PASSWORD ?? "Admin@FDP2026!",
  },
  {
    email: "sysadmin@fdportal.dev",
    name: "System Admin",
    role: "ADMIN" as const,
    password: "Sysadmin@FDP2026!",
  },
  {
    email: "finmanager@fdportal.dev",
    name: "Finance Manager",
    role: "FINANCE_MANAGER" as const,
    password: "FinMgr@FDP2026!",
  },
  {
    email: "finofficer@fdportal.dev",
    name: "Finance Officer",
    role: "FINANCE_OFFICER" as const,
    password: "FinOff@FDP2026!",
  },
  {
    email: "auditor@fdportal.dev",
    name: "Auditor",
    role: "AUDITOR" as const,
    password: "Auditor@FDP2026!",
  },
  {
    email: "viewer@fdportal.dev",
    name: "Viewer",
    role: "VIEWER" as const,
    password: "Viewer@FDP2026!",
  },
  {
    email: "client@fdportal.dev",
    name: "Demo Client",
    role: "CLIENT" as const,
    password: "Client@FDP2026!",
  },
];

async function main() {
  console.log("[reset-users] Deleting all existing users...");
  const deleted = await prisma.user.deleteMany({});
  console.log(`[reset-users] Deleted ${deleted.count} users.`);

  console.log("[reset-users] Creating canonical RBAC users...");
  for (const u of USERS) {
    await prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        role: u.role,
        hashedPassword: await hash(u.password, 12),
        status: "ACTIVE",
        department: "Finance",
        tokenVersion: 0,
        failedLoginAttempts: 0,
      },
    });
    console.log(`[reset-users]   ✓ ${u.role.padEnd(16)} ${u.email}`);
  }

  console.log("\n[reset-users] ─────────────────────────────────────────────");
  console.log("[reset-users] Portal login credentials:");
  console.log("[reset-users]");
  for (const u of USERS) {
    console.log(`[reset-users]   ${u.role.padEnd(16)} ${u.email.padEnd(30)} ${u.password}`);
  }
  console.log("\n[reset-users] Done.");
}

main()
  .catch((e) => {
    console.error("[reset-users] Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
