# Architecture

## Overview

FD Portal is a monolithic Next.js 14 application using the App Router pattern. The frontend and backend coexist in one codebase, deployed as a single unit. The database is PostgreSQL, accessed exclusively through Prisma ORM.

```
┌─────────────────────────────────────────────────────┐
│                   Browser / Client                   │
└──────────────────────────┬──────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────┐
│              Next.js App Router (Node.js)            │
│                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  App Pages  │  │ Route Handler│  │ Middleware  │  │
│  │ (RSC + RCC) │  │  (REST API)  │  │  (Auth)    │  │
│  └──────┬──────┘  └──────┬───────┘  └────────────┘  │
│         │                │                           │
│  ┌──────▼────────────────▼───────────────────────┐  │
│  │              Business Logic Layer              │  │
│  │  permissions · deposit-utils · secure-file    │  │
│  │  rate-limit · audit · email · api-response    │  │
│  └──────────────────────┬────────────────────────┘  │
│                         │                            │
│  ┌──────────────────────▼────────────────────────┐  │
│  │              Prisma ORM                        │  │
│  └──────────────────────┬────────────────────────┘  │
└─────────────────────────┼───────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────┐
│                  PostgreSQL Database                  │
└─────────────────────────────────────────────────────┘

┌────────────────────────────────────┐
│  Background Worker (node-cron)     │
│  reminder-processor · scheduler   │
└────────────────────────────────────┘
```

## Directory Structure

```
src/
  app/
    (auth)/login/          — Login page (unauthenticated route group)
    (dashboard)/           — Protected route group
      dashboard/           — Dashboard home
      deposits/            — Deposit list, detail, new
      reports/             — Portfolio analytics
      users/               — User management (admin only)
      audit-logs/          — Audit trail viewer
      settings/            — System configuration
    api/
      auth/[...nextauth]/  — NextAuth handler
      deposits/            — Deposit CRUD + lifecycle
      documents/           — Document download
      dashboard/           — Dashboard metrics
      users/               — User management
      audit-logs/          — Audit log query
      banks/               — Bank reference data
      beneficiaries/       — Beneficiary reference data
  components/
    auth/                  — Login form
    dashboard/             — Dashboard widgets
    deposits/              — Deposit table, forms, status badge
    layout/                — Sidebar, header
    ui/                    — Toast, shared primitives
  lib/
    auth.ts                — NextAuth configuration
    db.ts                  — Prisma singleton
    permissions.ts         — RBAC permission map
    rate-limit.ts          — DB-backed rate limiter
    deposit-utils.ts       — Business logic + state machine
    secure-file.ts         — Upload validation and storage
    email.ts               — Nodemailer transport
    audit.ts               — Audit log writer
    api-response.ts        — HTTP response helpers
    env.ts                 — Validated env vars
  server/workers/
    reminder-processor.ts  — Maturity email processor
    scheduler.ts           — node-cron entry point
  types/
    next-auth.d.ts         — Session type augmentation
  middleware.ts            — Route protection middleware

prisma/
  schema.prisma            — Database schema

scripts/
  seed.ts                  — Development seed data

tests/
  unit/                    — Unit tests (vitest)
  integration/             — Integration tests (planned)
```

## Key Design Decisions

### Server Components by Default
All dashboard pages are React Server Components. They fetch data directly from Prisma (no API round-trip), improving performance and simplifying auth.

### API Routes for Mutations
Create, update, status transitions, and uploads go through `/api/` route handlers with full Zod validation and rate limiting.

### Single Permission Check per Layer
Each API route and page performs one `requirePermission()` or `hasPermission()` check. There is no ACL middleware — checks are explicit and colocated with the logic they guard.

### Background Worker
The `scheduler.ts` module starts a node-cron job that runs the `reminder-processor` daily at 8 AM. In production, this runs as a separate Node.js process alongside the Next.js server.
