# FD Portal — Security Deposit & FDR Management System

A production-ready, full-stack portal for managing Fixed Deposits (FDRs), Security Deposits, Bank Guarantees, and Earnest Money Deposits with comprehensive RBAC, audit trails, and lifecycle management.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill environment variables
cp .env.example .env.local

# 3. Run database migrations
npx prisma migrate dev --name init

# 4. Seed development data
npx tsx scripts/seed.ts

# 5. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@fdportal.dev | Admin@Password123! |
| Finance Manager | manager@fdportal.dev | Manager@Password123! |
| Finance Officer | officer@fdportal.dev | Officer@Password123! |

> **Warning:** These are development credentials. Never use them in production.

## Architecture

- **Framework**: Next.js 14 App Router (TypeScript)
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js v4, JWT sessions, bcrypt password hashing
- **Validation**: Zod schemas on all API routes
- **Email**: Nodemailer (SMTP)
- **Scheduler**: node-cron for maturity reminders
- **Styling**: Tailwind CSS + CSS custom properties

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System design and component overview |
| [Database](docs/DATABASE.md) | Schema documentation |
| [Security Checklist](docs/SECURITY_CHECKLIST.md) | 19 security controls implementation status |
| [API Reference](docs/API.md) | REST API endpoints |
| [Deployment](docs/DEPLOYMENT.md) | Production deployment guide |

## RBAC Roles

| Role | Capabilities |
|------|-------------|
| SUPER_ADMIN | Full access including user management |
| ADMIN | All deposit ops + user management |
| FINANCE_MANAGER | Create, approve, export, manage deposits |
| FINANCE_OFFICER | Create and submit deposits for review |
| AUDITOR | Read-only + export access |
| VIEWER | Read-only access |

## Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run test         # Run unit tests
npm run test:cov     # Tests with coverage
npx prisma studio    # Database GUI
npx tsx scripts/seed.ts  # Seed dev data
```
