#!/usr/bin/env tsx
/**
 * One-off script: unlock and reset the SUPER_ADMIN account.
 * Safe to run against any environment — does NOT seed other data.
 *
 * Usage:
 *   npx tsx scripts/reset-admin.ts
 *   SEED_ADMIN_EMAIL=admin@fdportal.dev SEED_ADMIN_PASSWORD=Admin@FDP2026! npx tsx scripts/reset-admin.ts
 */
import { config } from "dotenv";
config();

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email    = process.env.SEED_ADMIN_EMAIL    ?? "admin@fdportal.dev";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin@FDP2026!";

  const hashed = await hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      hashedPassword: hashed,
      status: "ACTIVE",
      lockedUntil: null,
      failedLoginAttempts: 0,
      mfaEnabled: false,
      mfaSecret: null,
      tokenVersion: { increment: 1 },
    },
    create: {
      email,
      name: "Super Administrator",
      role: "SUPER_ADMIN",
      hashedPassword: hashed,
      status: "ACTIVE",
      department: "Finance",
    },
  });

  console.log(`[reset-admin] Done.`);
  console.log(`[reset-admin]   Email:    ${user.email}`);
  console.log(`[reset-admin]   Role:     ${user.role}`);
  console.log(`[reset-admin]   Status:   ${user.status}`);
  console.log(`[reset-admin]   Password: ${password}`);
  console.log(`[reset-admin] MFA disabled, account unlocked, token version bumped.`);
}

main()
  .catch((e) => { console.error("[reset-admin] Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
