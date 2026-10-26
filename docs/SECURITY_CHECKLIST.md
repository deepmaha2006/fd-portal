# Security Controls Checklist

All 19 mandatory security controls for the FD Portal.

## Status Legend
- ✅ Implemented
- 🔶 Partial / In-progress
- ❌ Not yet implemented

---

## 1. Authentication — ✅

- NextAuth.js v4 with JWT strategy
- bcrypt hashing (12 rounds) via bcryptjs
- Account lockout after 5 failed attempts (15-minute lockout)
- Secure `__Secure-` prefixed cookie in production
- 8-hour session lifetime

**File:** `src/lib/auth.ts`

---

## 2. Authorization (RBAC) — ✅

- 6 roles: SUPER_ADMIN, ADMIN, FINANCE_MANAGER, FINANCE_OFFICER, AUDITOR, VIEWER
- `PERMISSIONS` map with 19 granular permissions
- `requirePermission()` throws `ForbiddenError` (403) on violation
- Every API route and page checks permissions server-side

**Files:** `src/lib/permissions.ts`, all `src/app/api/*/route.ts`

---

## 3. Row-Level Security (RLS) — 🔶

- API-level filtering: users only see deposits they own or are assigned
- Database-level RLS policies planned for production migration

**Note:** Add `ALTER TABLE deposits ENABLE ROW LEVEL SECURITY` + policies in prod migration.

---

## 4. IDOR Prevention — ✅

- All resource lookups include ownership/role checks
- Deposits are fetched with explicit `where: { id, ...(role check) }` guards
- UUIDs are not sequential (Prisma `cuid()` default)

---

## 5. Input Validation — ✅

- Zod schemas validate all API request bodies
- Strict type coercion with `.parse()` (throws `ZodError` on violation)
- `handleApiError()` returns `400` with field-level errors for Zod failures
- Forms use `react-hook-form` + `zodResolver` for client-side pre-validation

**Files:** All `src/app/api/**` routes, form components

---

## 6. Parameterized Queries — ✅

- All database access via Prisma ORM (no raw string interpolation)
- The one `$queryRaw` call (reports) uses tagged template literals (Prisma's safe API)

---

## 7. Rate Limiting — ✅

- DB-backed rate limiter (`RateLimit` model)
- Default: 60 requests/minute per endpoint per user
- Export endpoint: 5 requests/hour
- Login: checked by NextAuth credentials provider
- Fails open (allow) on DB errors to avoid locking out users

**File:** `src/lib/rate-limit.ts`

---

## 8. CORS — ✅

- Next.js App Router restricts API routes to same-origin by default
- No `Access-Control-Allow-Origin: *` header set

---

## 9. HTTPS — 🔶

- Production deployment must terminate TLS at the load balancer/reverse proxy
- `NEXTAUTH_URL` must use `https://` in production
- `__Secure-` cookie prefix enforces HTTPS-only cookie delivery

---

## 10. Security Headers — ✅

All headers set in `next.config.ts`:

- `Content-Security-Policy` — restricts script/style/frame sources
- `X-Frame-Options: DENY` — clickjacking prevention
- `X-Content-Type-Options: nosniff` — MIME sniffing prevention
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` — disables camera, microphone, geolocation

**File:** `next.config.ts`

---

## 11. File Upload Security — ✅

- MIME type allowlist (PDF, JPEG, PNG, WEBP, TIFF, DOC, DOCX, XLS, XLSX)
- Magic byte validation (reads file header bytes, not just extension)
- Max file size: 10 MB
- UUID-based server-side storage paths (original filename never used)
- Path traversal prevention in `resolveStoragePath()`
- `Content-Disposition: attachment` enforced on download

**File:** `src/lib/secure-file.ts`, `src/app/api/deposits/[id]/documents/route.ts`

---

## 12. Audit Trail — ✅

- Every state change, login, approval, document action logged to `AuditLog`
- Fields: userId, action, entityType, entityId, ipAddress, userAgent, description, metadata
- Audit logging never crashes the application (wrapped in try/catch)
- Immutable — no UPDATE/DELETE on audit logs

**File:** `src/lib/audit.ts`

---

## 13. Separation of Duties — ✅

- Deposit creator cannot approve their own deposit (checked in status transition API)
- `createdById !== approverId` enforced server-side

**File:** `src/app/api/deposits/[id]/status/route.ts`

---

## 14. Deposit Lifecycle State Machine — ✅

- Valid transitions defined in `isValidTransition()`
- Terminal states (MATURED, CANCELLED, CLOSED, FORFEITED) are immutable
- State machine enforced server-side; client-side is display only

**File:** `src/lib/deposit-utils.ts`

---

## 15. CSV Formula Injection Prevention — ✅

- `sanitizeCsvField()` prefixes `=`, `+`, `-`, `@` with `'` (Excel formula prefix prevention)
- Applied to all fields in CSV export

**File:** `src/lib/deposit-utils.ts`, `src/app/api/deposits/export/route.ts`

---

## 16. Account Number Masking — ✅

- Account numbers displayed as `****1234` (last 4 digits only)
- Masking applied in UI components and CSV exports

---

## 17. Secret Management — ✅

- No secrets committed to the repository
- `.env` files in `.gitignore`
- `src/lib/env.ts` validates required vars at startup; throws in production if missing
- `.env.example` contains only placeholder values

---

## 18. Email Notification Security — ✅

- Idempotency keys prevent duplicate reminders: `reminder:{depositId}:{event}:{date}`
- Exponential backoff retry (max 3 attempts) for failed emails
- HTML email content uses escaped interpolation only

**File:** `src/server/workers/reminder-processor.ts`

---

## 19. Session Security — ✅

- JWT tokens signed with `NEXTAUTH_SECRET` (must be 32+ bytes in production)
- Tokens include `iat`/`exp` claims (8-hour TTL)
- Token invalidation on password change via `tokenVersion` pattern
- `__Secure-` prefix in production (HTTPS-only)
- `SameSite=lax` to mitigate CSRF on state-changing requests

**File:** `src/lib/auth.ts`
