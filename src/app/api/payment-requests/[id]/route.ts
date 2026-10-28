import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserId, UnauthorizedError, ForbiddenError } from "@/lib/permissions";
import { ok, handleApiError } from "@/lib/api-response";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();

    const userId = getUserId(session)!;
    const role = (session.user as any)?.role as string;
    const isAdmin = ["SUPER_ADMIN", "ADMIN", "FINANCE_MANAGER", "FINANCE_OFFICER"].includes(role);

    const request = await prisma.paymentRequest.findUnique({
      where: { id: params.id },
      include: {
        client: { select: { name: true, email: true, department: true } },
        reviewedBy: { select: { name: true } },
        statusHistory: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!request) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    }

    if (!isAdmin && request.clientId !== userId) {
      throw new ForbiddenError("You do not have access to this request");
    }

    return ok(request);
  } catch (err) {
    return handleApiError(err);
  }
}
