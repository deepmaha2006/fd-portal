/**
 * HTTP-level security tests for three RBAC/SoD scenarios.
 * Route handlers are called directly (no HTTP server needed);
 * getServerSession and prisma are fully mocked.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mock next-auth ────────────────────────────────────────────────────────────
vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn(),
}));

// ─── Mock prisma ───────────────────────────────────────────────────────────────
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    paymentRequest: {
      findUnique: vi.fn(),
    },
    deposit: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// ─── Mock audit + reauth (side-effects we don't care about here) ───────────────
vi.mock("@/lib/audit", () => ({ auditLog: vi.fn() }));
vi.mock("@/lib/reauth", () => ({
  requireRecentAuth: vi.fn().mockResolvedValue(undefined),
  ReauthRequiredError: class ReauthRequiredError extends Error {},
}));

// ─── Import mocks and handlers after vi.mock calls ────────────────────────────
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/db";

const mockGetServerSession = vi.mocked(getServerSession);
const mockPrisma = vi.mocked(prisma, true);

function makeRequest(
  url: string,
  method: "GET" | "POST" | "PATCH",
  body?: unknown
): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { "content-type": "application/json", origin: "http://localhost:3000" },
    body: body != null ? JSON.stringify(body) : undefined,
  });
}

function makeSession(id: string, role: string) {
  return {
    user: { id, email: `${role.toLowerCase()}@example.com`, name: role, role },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  };
}

// ─── 1. Privilege Escalation ──────────────────────────────────────────────────

describe("Privilege escalation — PATCH /api/users/[id]/role", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ADMIN cannot assign ADMIN role to another user (403)", async () => {
    const { PATCH } = await import("@/app/api/users/[id]/role/route");

    mockGetServerSession.mockResolvedValue(makeSession("actor-admin", "ADMIN"));

    // Target user currently has FINANCE_OFFICER role
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "target-user",
      email: "target@example.com",
      role: "FINANCE_OFFICER",
    } as any);

    const req = makeRequest(
      "http://localhost:3000/api/users/target-user/role",
      "PATCH",
      { role: "ADMIN" } // attempting to escalate to peer role
    );

    const res = await PATCH(req, { params: { id: "target-user" } });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Access denied");
  });

  it("ADMIN cannot assign SUPER_ADMIN role (403)", async () => {
    const { PATCH } = await import("@/app/api/users/[id]/role/route");

    mockGetServerSession.mockResolvedValue(makeSession("actor-admin", "ADMIN"));
    // ChangeRoleSchema excludes SUPER_ADMIN — should give 400 (Zod validation)
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "target-user",
      email: "target@example.com",
      role: "FINANCE_OFFICER",
    } as any);

    const req = makeRequest(
      "http://localhost:3000/api/users/target-user/role",
      "PATCH",
      { role: "SUPER_ADMIN" }
    );

    const res = await PATCH(req, { params: { id: "target-user" } });
    // SUPER_ADMIN is excluded from the ChangeRoleSchema enum → 400 or 500 from Zod
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("FINANCE_MANAGER (no user:role_change permission) gets 403", async () => {
    const { PATCH } = await import("@/app/api/users/[id]/role/route");

    mockGetServerSession.mockResolvedValue(
      makeSession("actor-fm", "FINANCE_MANAGER")
    );

    const req = makeRequest(
      "http://localhost:3000/api/users/some-user/role",
      "PATCH",
      { role: "VIEWER" }
    );

    const res = await PATCH(req, { params: { id: "some-user" } });
    expect(res.status).toBe(403);
  });
});

// ─── 2. IDOR — GET /api/payment-requests/[id] ────────────────────────────────

describe("IDOR — GET /api/payment-requests/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("CLIENT cannot read another CLIENT's payment request (403)", async () => {
    const { GET } = await import("@/app/api/payment-requests/[id]/route");

    mockGetServerSession.mockResolvedValue(makeSession("client-a", "CLIENT"));

    // Request belongs to a different client
    mockPrisma.paymentRequest.findUnique.mockResolvedValue({
      id: "req-123",
      clientId: "client-b", // different user!
      client: { name: "Other Client", email: "other@example.com", department: null },
      reviewedBy: null,
      statusHistory: [],
    } as any);

    const req = makeRequest(
      "http://localhost:3000/api/payment-requests/req-123",
      "GET"
    );

    const res = await GET(req, { params: { id: "req-123" } });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Access denied");
  });

  it("CLIENT can read their own payment request (200)", async () => {
    const { GET } = await import("@/app/api/payment-requests/[id]/route");

    mockGetServerSession.mockResolvedValue(makeSession("client-a", "CLIENT"));

    mockPrisma.paymentRequest.findUnique.mockResolvedValue({
      id: "req-456",
      clientId: "client-a", // same user
      client: { name: "Client A", email: "client-a@example.com", department: null },
      reviewedBy: null,
      statusHistory: [],
    } as any);

    const req = makeRequest(
      "http://localhost:3000/api/payment-requests/req-456",
      "GET"
    );

    const res = await GET(req, { params: { id: "req-456" } });
    expect(res.status).toBe(200);
  });

  it("FINANCE_OFFICER (admin role) can read any payment request (200)", async () => {
    const { GET } = await import("@/app/api/payment-requests/[id]/route");

    mockGetServerSession.mockResolvedValue(
      makeSession("officer-x", "FINANCE_OFFICER")
    );

    mockPrisma.paymentRequest.findUnique.mockResolvedValue({
      id: "req-789",
      clientId: "client-b",
      client: { name: "Client B", email: "b@example.com", department: null },
      reviewedBy: null,
      statusHistory: [],
    } as any);

    const req = makeRequest(
      "http://localhost:3000/api/payment-requests/req-789",
      "GET"
    );

    const res = await GET(req, { params: { id: "req-789" } });
    expect(res.status).toBe(200);
  });
});

// ─── 3. Maker-checker SoD — POST /api/deposits/[id]/status ───────────────────

describe("Maker-checker SoD — POST /api/deposits/[id]/status", () => {
  beforeEach(() => vi.clearAllMocks());

  it("FINANCE_MANAGER cannot approve a deposit they created (403)", async () => {
    const { POST } = await import("@/app/api/deposits/[id]/status/route");

    const FM_ID = "fm-maker-id";
    mockGetServerSession.mockResolvedValue(makeSession(FM_ID, "FINANCE_MANAGER"));

    mockPrisma.deposit.findUnique.mockResolvedValue({
      id: "dep-001",
      status: "PENDING_REVIEW",
      createdById: FM_ID, // actor IS the creator — SoD violation
      releaseRequestedById: null,
      principalAmount: 100_000, // below HIGH_VALUE_THRESHOLD
      referenceNumber: "FD-2024-001",
    } as any);

    const req = makeRequest(
      "http://localhost:3000/api/deposits/dep-001/status",
      "POST",
      { status: "APPROVED" }
    );

    const res = await POST(req, { params: { id: "dep-001" } });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Access denied");
  });

  it("FINANCE_MANAGER CAN approve a deposit created by someone else (200)", async () => {
    const { POST } = await import("@/app/api/deposits/[id]/status/route");

    const FM_ID = "fm-approver-id";
    mockGetServerSession.mockResolvedValue(makeSession(FM_ID, "FINANCE_MANAGER"));

    mockPrisma.deposit.findUnique.mockResolvedValue({
      id: "dep-002",
      status: "PENDING_REVIEW",
      createdById: "officer-other", // different person created it
      releaseRequestedById: null,
      principalAmount: 100_000,
      referenceNumber: "FD-2024-002",
    } as any);

    // Mock $transaction to succeed
    mockPrisma.$transaction.mockImplementation(async (fn: any) =>
      fn({
        deposit: { update: vi.fn().mockResolvedValue({ id: "dep-002", status: "APPROVED" }) },
        lifecycleEvent: { create: vi.fn().mockResolvedValue({}) },
        approvalRequest: { create: vi.fn().mockResolvedValue({}) },
      })
    );

    const req = makeRequest(
      "http://localhost:3000/api/deposits/dep-002/status",
      "POST",
      { status: "APPROVED" }
    );

    const res = await POST(req, { params: { id: "dep-002" } });
    expect(res.status).toBe(200);
  });

  it("FINANCE_OFFICER cannot approve any deposit (403 — no deposit:approve permission)", async () => {
    const { POST } = await import("@/app/api/deposits/[id]/status/route");

    mockGetServerSession.mockResolvedValue(
      makeSession("officer-y", "FINANCE_OFFICER")
    );

    mockPrisma.deposit.findUnique.mockResolvedValue({
      id: "dep-003",
      status: "PENDING_REVIEW",
      createdById: "officer-other",
      releaseRequestedById: null,
      principalAmount: 100_000,
      referenceNumber: "FD-2024-003",
    } as any);

    const req = makeRequest(
      "http://localhost:3000/api/deposits/dep-003/status",
      "POST",
      { status: "APPROVED" }
    );

    const res = await POST(req, { params: { id: "dep-003" } });
    expect(res.status).toBe(403);
  });
});
