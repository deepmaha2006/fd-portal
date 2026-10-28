export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requirePermission, UnauthorizedError } from "@/lib/permissions";
import { ok, handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();
    requirePermission(session, "admin:audit_logs");

    const page = Number(req.nextUrl.searchParams.get("page") ?? 1);
    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 50), 200);
    const action = req.nextUrl.searchParams.get("action");
    const actorId = req.nextUrl.searchParams.get("actorId");
    const targetId = req.nextUrl.searchParams.get("targetId");
    const dateFrom = req.nextUrl.searchParams.get("dateFrom");
    const dateTo = req.nextUrl.searchParams.get("dateTo");

    const where: Record<string, unknown> = {};
    if (action) where.action = action;
    if (actorId) where.actorId = actorId;
    if (targetId) where.targetId = targetId;
    if (dateFrom || dateTo) {
      where.occurredAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      };
    }

    const [logs, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { occurredAt: "desc" },
        include: {
          actor: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return ok({ logs, pagination: { page, limit, total } });
  } catch (err) {
    return handleApiError(err);
  }
}
