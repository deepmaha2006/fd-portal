export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requirePermission, UnauthorizedError } from "@/lib/permissions";
import { ok, handleApiError } from "@/lib/api-response";

const DENIAL_THRESHOLD = 5;
const WINDOW_HOURS = 1;

/**
 * GET /api/admin/security-alerts
 *
 * Returns users who have triggered 5+ PERMISSION_DENIED events in the last hour.
 * Restricted to SUPER_ADMIN and ADMIN (user:manage permission).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();
    requirePermission(session, "user:manage");

    const since = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000);

    // Fetch all PERMISSION_DENIED events in the window — group in-process
    // (MongoDB Prisma groupBy+having is unreliable; application-level is safe)
    const events = await prisma.auditLog.findMany({
      where: {
        action: "PERMISSION_DENIED",
        occurredAt: { gte: since },
        actorId: { not: null },
      },
      orderBy: { occurredAt: "desc" },
      select: { actorId: true, ipAddress: true, metadata: true, occurredAt: true },
      take: 10000,
    });

    // Count per actor and track last event
    const countMap = new Map<string, number>();
    const lastEventMap = new Map<string, typeof events[0]>();
    for (const ev of events) {
      if (!ev.actorId) continue;
      countMap.set(ev.actorId, (countMap.get(ev.actorId) ?? 0) + 1);
      if (!lastEventMap.has(ev.actorId)) {
        lastEventMap.set(ev.actorId, ev);
      }
    }

    // Filter to actors who crossed the threshold
    const triggeredIds = [...countMap.entries()]
      .filter(([, count]) => count >= DENIAL_THRESHOLD)
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);

    if (triggeredIds.length === 0) {
      return ok({ alerts: [], checkedAt: new Date(), windowHours: WINDOW_HOURS, threshold: DENIAL_THRESHOLD });
    }

    const users = await prisma.user.findMany({
      where: { id: { in: triggeredIds } },
      select: { id: true, name: true, email: true, role: true, status: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const alerts = triggeredIds.map((id) => {
      const lastEvent = lastEventMap.get(id);
      return {
        actorId: id,
        count: countMap.get(id)!,
        user: userMap.get(id) ?? null,
        lastOccurredAt: lastEvent?.occurredAt ?? null,
        lastIp: lastEvent?.ipAddress ?? null,
        lastMetadata: lastEvent?.metadata ?? null,
      };
    });

    return ok({ alerts, checkedAt: new Date(), windowHours: WINDOW_HOURS, threshold: DENIAL_THRESHOLD });
  } catch (err) {
    return handleApiError(err);
  }
}
