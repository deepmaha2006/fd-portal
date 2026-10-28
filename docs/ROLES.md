# Roles & Permissions Reference

> Source of truth: `src/lib/permissions.ts`. This document is generated from the code and updated manually.

## Role Hierarchy

| Level | Role             | Description                                                  |
|-------|------------------|--------------------------------------------------------------|
| 6     | SUPER_ADMIN      | Platform owner. User management for all roles, high-value final approval, account unlock. Cannot create/submit deposits (SoD). |
| 5     | ADMIN            | User management for roles below ADMIN, KYC review, bank settings, MFA reset, user deactivation. Cannot approve deposits. |
| 4     | FINANCE_MANAGER  | Approves/rejects/archives/exports deposits, approves payment requests, generates reports, manages reminders. Cannot create or submit deposits. |
| 3     | FINANCE_OFFICER  | Creates, updates, submits deposits; requests release; uploads documents; moves payment requests to UNDER_REVIEW. |
| 2     | AUDITOR          | Read-only access to everything: deposits, audit logs, documents, exports. No write operations of any kind. |
| 1     | VIEWER           | Read-only access to deposit summary fields only. No documents, no client PII, no export. |
| 0     | CLIENT           | Self-registered. Can manage own KYC, create and cancel own payment requests (requires `isKycVerified=true`). |

## Key Constraints

### Separation of Duties (maker-checker)
- A FINANCE_OFFICER who **creates** a deposit cannot **approve** it.
- The actor who **requests** a release (`RELEASE_PENDING`) cannot **approve** the `RELEASED` step.
- A payment request reviewer cannot be the same person who created the request.
- An Officer can only move a request to `UNDER_REVIEW`; only a Manager can approve or reject.

### High-Value Threshold (≥ ₹1,00,00,000 / 10M INR)
- FINANCE_MANAGER provides first approval.
- SUPER_ADMIN must provide second approval (`ApprovalRequest.secondApproverId`).

### Role Management (`canManageRole`)
- An actor may only create/edit users with roles **strictly below** their own level.
- SUPER_ADMIN may manage ADMIN (same level, special exception).
- No one can create another SUPER_ADMIN through the API (must be done via DB seed or direct DB access).

### Session Security
- `tokenVersion` on User is incremented on role change, deactivation, or password reset.
- Every session refresh checks `tokenVersion` and `status` against the DB; stale tokens are rejected immediately.
- MFA (TOTP) is **mandatory** for SUPER_ADMIN, ADMIN, FINANCE_MANAGER.
- MFA is **optional** for FINANCE_OFFICER, AUDITOR, VIEWER, CLIENT.

## Payment Request State Machine

```
SUBMITTED ──(Officer)──> UNDER_REVIEW ──(Manager)──> APPROVED ──> PROCESSING ──> COMPLETED
    │                          │
    └─────(Client/Manager)─────┴──> CANCELLED
                                    (REJECTED from UNDER_REVIEW)
```

Rules:
- Only an Officer can move SUBMITTED → UNDER_REVIEW.
- Reviewer cannot be the creator.
- Only a Manager can approve, reject, move to PROCESSING or COMPLETED.
- CANCELLED only allowed from SUBMITTED or UNDER_REVIEW.
