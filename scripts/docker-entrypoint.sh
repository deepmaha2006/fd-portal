#!/bin/sh
set -e

echo "==> FD Portal starting..."
echo "==> Running database migrations..."
npx prisma migrate deploy

# Seed only if the users table is empty (idempotent)
USER_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.count().then(n => { console.log(n); p.\$disconnect(); });
" 2>/dev/null || echo "0")

if [ "$USER_COUNT" = "0" ]; then
  echo "==> Seeding initial data..."
  npx tsx scripts/seed.ts || echo "Seed skipped (non-fatal)"
else
  echo "==> Database already seeded ($USER_COUNT users found), skipping seed."
fi

echo "==> Starting Next.js server..."
exec node server.js
