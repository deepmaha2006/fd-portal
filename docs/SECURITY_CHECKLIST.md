# Security Checklist

Legend: ✅ Implemented + tested | ⚠️ Partial / manual step needed | ❌ Not implemented | N/A Not applicable

---

## 1. Role Model & Permissions

| Item | Status | Notes |
|------|--------|-------|
| 7 roles with clear hierarchy | ✅ | `src/lib/permissions.ts` — `ROLE_HIERARCHY` map |
| SUPER_ADMIN has no deposit:create/approve (SoD) | ✅ | Unit tests in `permissions.test.ts` |
| ADMIN has no deposit:approve/create | ✅ | Unit tests |
| FINANCE_MANAGER is sole approver | ✅ | Unit tests |
| FINANCE_OFFICER create/submit only | ✅ | Unit tests |
| AUDITOR read-only, zero write permissions | ✅ | Unit tests |
| VIEWER deposit:read only, no docs/export/PII | ✅ | Unit tests |
| CLIENT payment_request gated by isKycVerified | ✅ | `/api/payment-requests POST` route |
| `canManageRole()` hierarchy check | ✅ | `rbac-escalation.test.ts` |

## 2. Privilege Escalation

| Item | Status | Notes |
|------|--------|-------|
| api/users POST blocks creating role >= actor | ✅ | `canManageRole` + audit log |
| api/users/[id]/role PATCH blocks self-modify | ✅ | Explicit check |
| Cannot remove last SUPER_ADMIN | ✅ | Count check before update |
| Role change bumps tokenVersion (revokes sessions) | ✅ | `tokenVersion: { increment: 1 }` |
| Deactivation bumps tokenVersion | ✅ | Same |

## 3. Maker-Checker / Separation of Duties

| Item | Status | Notes |
|------|--------|-------|
| Deposit creator cannot approve | ✅ | `canApproveDeposit` in `maker-checker.ts` |
| Release requester cannot approve RELEASED | ✅ | `canApproveRelease`; `releaseRequestedById` stored |
| HIGH_VALUE_THRESHOLD (10M INR) configured | ✅ | `maker-checker.ts` |
| High-value dual approval (Manager + SUPER_ADMIN) | ✅ | First: FINANCE_MANAGER via status route; Second: `POST /api/deposits/[id]/second-approve` |
| Payment request reviewer ≠ creator | ✅ | `UNDER_REVIEW` transition check |
| Officer can only move to UNDER_REVIEW | ✅ | TRANSITIONS map |
| Manager only approves/rejects | ✅ | TRANSITIONS map |
| req.json() double-parse bug fixed | ✅ | Payment request status route |

## 4. Row-Level Access

| Item | Status | Notes |
|------|--------|-------|
| FINANCE_OFFICER can only edit own deposits | ✅ | deposits PATCH checks `existing.createdById === actorId` for FINANCE_OFFICER |
| VIEWER responses strip doc links and PII | ✅ | deposits GET returns summary-only fields for VIEWER role |
| CLIENT IDOR check on payment requests | ✅ | status route + payment-request [id] route |
| Postgres RLS | N/A | MongoDB — no RLS support; application-level row security used instead |

## 5. Soft Delete (No Hard Deletes)

| Item | Status | Notes |
|------|--------|-------|
| Deposits use soft delete (deletedAt, deletedById, reason) | ✅ | Schema + DELETE route |
| Requires reason (min 10 chars) | ✅ | `SoftDeleteSchema` |
| Restricted to SUPER_ADMIN + ADMIN | ✅ | Role check in DELETE route |
| Audit logs DEPOSIT_DELETE_REQUESTED | ✅ | |
| Audit logs are append-only | ✅ | No UPDATE/DELETE on AuditLog in any route |
| DB-level revocation of UPDATE/DELETE on AuditLog | ⚠️ | MongoDB RBAC role needs to be configured in Atlas — manual step |

## 6. Authentication

| Item | Status | Notes |
|------|--------|-------|
| TOTP MFA (otpauth) implemented | ✅ | `auth.ts` — mandatory for SUPER_ADMIN/ADMIN/FINANCE_MANAGER |
| MFA blocks login if not configured for mandatory roles | ✅ | Throws `MfaNotConfigured` |
| tokenVersion JWT revocation | ✅ | Session callback re-queries DB; stale tokens rejected |
| Account lockout after 5 failed logins | ✅ | Pre-existing |
| PENDING_VERIFICATION blocks login | ✅ | Pre-existing |
| 30-min idle timeout for admin roles | ✅ | `adminIdleExpiry` in JWT at sign-in; session callback invalidates after 30 min |
| Re-authentication for sensitive actions | ✅ | `src/lib/reauth.ts` — requireRecentAuth() on second-approve + role-change |
| Client registration email verification | ⚠️ | `emailVerified` field exists; verification email not yet wired |
| KYC review only from PENDING status | ✅ | `/api/kyc/[id]/review` checks status |
| KYC reviewer ≠ account owner | ✅ | Check in KYC review route |
| Seed script blocked in production | ✅ | `scripts/seed.ts` throws if `NODE_ENV=production` |

## 7. Hardening

| Item | Status | Notes |
|------|--------|-------|
| Rate limit: login (10/15min) | ✅ | `checkRateLimit` in login route |
| Rate limit: register | ✅ | `checkRateLimit` wired in register POST |
| Rate limit: KYC upload | ✅ | `checkRateLimit` wired in KYC POST |
| Rate limit: export | ✅ | `checkRateLimit` pre-existing; `getClientIp()` now used |
| Trusted proxy only (X-Forwarded-For) | ✅ | `getClientIp()` used in all hardened routes |
| HSTS (1 year + subdomains) | ✅ | `next.config.mjs` |
| CSP (base-uri, form-action) | ✅ | `next.config.mjs` |
| X-Frame-Options DENY | ✅ | `next.config.mjs` |
| Referrer-Policy | ✅ | `next.config.mjs` |
| Permissions-Policy | ✅ | `next.config.mjs` |
| CSRF (Origin check) helper | ✅ | `src/lib/csrf.ts` — wired into register, KYC, users, second-approve |
| File upload: MIME allowlist | ✅ | TIFF + WEBP signatures added; null fallthrough now rejects unknown formats |
| File upload: random storage names | ✅ | Pre-existing |
| File upload: signed download URLs | ⚠️ | Not yet short-lived signed URLs |
| Audit log 403 denials | ✅ | `PERMISSION_DENIED` action in escalation paths |
| Audit log all login/logout/MFA events | ✅ | `auth.ts` |
| Dashboard alert for 5+ denials/user/hour | ✅ | `GET /api/admin/security-alerts` — application-level grouping, SUPER_ADMIN+ADMIN only |
| Encrypt PAN/account numbers at rest | ✅ | `src/lib/field-encrypt.ts` — AES-256-GCM; wired into deposit create/patch/GET |

## 8. UI

| Item | Status | Notes |
|------|--------|-------|
| `usePermission()` hook | ✅ | `src/hooks/use-permission.ts` |
| Server enforces all checks (not just UI hiding) | ✅ | Every route has its own permission check |
| Roles & Permissions matrix page | ✅ | `/roles` — SUPER_ADMIN + AUDITOR only |

## 9. Tests

| Item | Status | Notes |
|------|--------|-------|
| All role × permission combinations | ✅ | `permissions.test.ts` (34 tests) |
| canManageRole edge cases | ✅ | `permissions.test.ts` + `rbac-escalation.test.ts` (17 tests) |
| Maker-checker SoD rules | ✅ | `maker-checker.test.ts` (13 tests) |
| Deposit transition rules | ✅ | `deposit-utils.test.ts` |
| CSRF check | ✅ | `csrf.test.ts` (5 tests) |
| Privilege escalation API tests (HTTP-level) | ❌ | Needs integration test setup with DB |
| IDOR tests (HTTP-level) | ❌ | Needs integration test setup with DB |
| Officer self-approval test (HTTP-level) | ❌ | Needs integration test setup with DB |

---

> No item is marked ✅ unless there is code or a test proving it works.
> ⚠️ items are partially done and need follow-up work before being considered complete.
