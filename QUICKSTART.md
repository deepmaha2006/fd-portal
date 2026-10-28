# FD Portal — Quick Start Guide

**Live deployment:** https://fd-portal-kohl.vercel.app

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL (MongoDB Atlas), NEXTAUTH_SECRET, NEXTAUTH_URL

# 3. Push Prisma schema to MongoDB
npx prisma db push

# 4. Seed all 7 RBAC users + sample deposits
npx tsx scripts/seed.ts

# 5. Start dev server
npm run dev
```

App runs at http://localhost:3000

---

## Login Credentials (development instance)

| Role | Email | Password |
|------|-------|----------|
| SUPER_ADMIN | admin@fdportal.dev | Admin@FDP2026! |
| ADMIN | sysadmin@fdportal.dev | Sysadmin@FDP2026! |
| FINANCE_MANAGER | finmanager@fdportal.dev | FinMgr@FDP2026! |
| FINANCE_OFFICER | finofficer@fdportal.dev | FinOff@FDP2026! |
| AUDITOR | auditor@fdportal.dev | Auditor@FDP2026! |
| VIEWER | viewer@fdportal.dev | Viewer@FDP2026! |
| CLIENT | client@fdportal.dev | Client@FDP2026! |

- **SUPER_ADMIN / ADMIN / FINANCE_MANAGER / FINANCE_OFFICER / AUDITOR / VIEWER** → sign in at `/login`, land at `/dashboard`
- **CLIENT** → sign in at `/login`, land at `/portal`

---

## Resetting Users

To wipe all existing users and re-create canonical accounts:

```bash
npx tsx scripts/reset-users.ts
```

> ⚠️  Destructive — do not run against production.

---

## Production Deployment (Vercel)

1. Push code to GitHub
2. Import project at https://vercel.com/new
3. Set environment variables in Vercel dashboard:
   - `DATABASE_URL` — MongoDB Atlas connection string
   - `NEXTAUTH_SECRET` — `openssl rand -base64 32`
   - `NEXTAUTH_URL` — your Vercel URL (e.g. `https://fd-portal-kohl.vercel.app`)
   - `APP_ENV` — `production`
4. Deploy — Vercel runs `prisma generate && next build` automatically

---

## Generating a Secure Secret

```bash
openssl rand -base64 32
```

Set it as `NEXTAUTH_SECRET`. Never use the dev default in production.
