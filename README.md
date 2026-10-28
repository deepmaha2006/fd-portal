# FD Portal — Security Deposit & FDR Management System

A production-ready, full-stack portal for managing Fixed Deposits (FDRs), Security Deposits, Bank Guarantees, and Earnest Money Deposits with comprehensive RBAC, audit trails, and lifecycle management.

**Live:** https://fd-portal-kohl.vercel.app

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill environment variables
cp .env.example .env
# Edit .env — set DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL

# 3. Push schema to MongoDB
npx prisma db push

# 4. Seed development data (all 7 RBAC roles)
npx tsx scripts/seed.ts

# 5. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Portal Login Credentials

> **Note:** These are for the development/staging instance only.

```
┌─────────────────┬─────────────────────────┬───────────────────┐
│      Role       │          Email          │     Password      │
├─────────────────┼─────────────────────────┼───────────────────┤
│ SUPER_ADMIN     │ admin@fdportal.dev      │ Admin@FDP2026!    │
├─────────────────┼─────────────────────────┼───────────────────┤
│ ADMIN           │ sysadmin@fdportal.dev   │ Sysadmin@FDP2026! │
├─────────────────┼─────────────────────────┼───────────────────┤
│ FINANCE_MANAGER │ finmanager@fdportal.dev │ FinMgr@FDP2026!   │
├─────────────────┼─────────────────────────┼───────────────────┤
│ FINANCE_OFFICER │ finofficer@fdportal.dev │ FinOff@FDP2026!   │
├─────────────────┼─────────────────────────┼───────────────────┤
│ AUDITOR         │ auditor@fdportal.dev    │ Auditor@FDP2026!  │
├─────────────────┼─────────────────────────┼───────────────────┤
│ VIEWER          │ viewer@fdportal.dev     │ Viewer@FDP2026!   │
├─────────────────┼─────────────────────────┼───────────────────┤
│ CLIENT          │ client@fdportal.dev     │ Client@FDP2026!   │
└─────────────────┴─────────────────────────┴───────────────────┘
```

- **SUPER_ADMIN → VIEWER** sign in at `/login` → land at `/dashboard`
- **CLIENT** signs in at `/login` → lands at `/portal`

## Architecture

- **Framework**: Next.js 14 App Router (TypeScript)
- **Database**: MongoDB Atlas + Prisma ORM
- **Auth**: NextAuth.js v4, JWT sessions, bcrypt (12 rounds)
- **Validation**: Zod schemas on all API routes
- **Email**: Nodemailer (SMTP)
- **Scheduler**: node-cron for maturity reminders
- **Styling**: Tailwind CSS

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System design and component overview |
| [Deployment](docs/DEPLOYMENT.md) | Production deployment guide |
| [Quickstart](QUICKSTART.md) | Step-by-step local setup |

## RBAC Roles

| Role | Capabilities |
|------|-------------|
| SUPER_ADMIN | Full access including user management |
| ADMIN | All deposit ops + user management |
| FINANCE_MANAGER | Create, approve, export, manage deposits |
| FINANCE_OFFICER | Create and submit deposits for review |
| AUDITOR | Read-only + export access |
| VIEWER | Read-only access |
| CLIENT | Self-service portal (payment requests, KYC) |

## Scripts

```bash
npm run dev                      # Development server
npm run build                    # Production build
npm run test                     # Run unit tests
npm run test:cov                 # Tests with coverage
npx prisma studio                # Database GUI
npx tsx scripts/seed.ts          # Seed all 7 RBAC users + sample data
npx tsx scripts/reset-users.ts   # ⚠️  Wipe all users & re-create canonical accounts
```
