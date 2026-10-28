import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requirePermission, getUserId, UnauthorizedError } from "@/lib/permissions";
import { ok, handleApiError } from "@/lib/api-response";
import { auditLog } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();
    requirePermission(session, "user:update");

    const actorId = getUserId(session)!;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    const user = await prisma.user.findUnique({ where: { id: params.id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.status !== "PENDING_VERIFICATION") {
      return NextResponse.json({ error: "User is not pending verification" }, { status: 422 });
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: { status: "ACTIVE" },
      select: { id: true, email: true, name: true, status: true },
    });

    await auditLog({
      action: "USER_ACTIVATED",
      actorId,
      targetType: "User",
      targetId: params.id,
      ipAddress: ip,
      metadata: { email: user.email },
    });

    return ok(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
