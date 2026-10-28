export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requirePermission, getUserId, UnauthorizedError } from "@/lib/permissions";
import { ok, handleApiError } from "@/lib/api-response";
import { signDocumentToken } from "@/lib/signed-token";

const TTL_SECONDS = 300; // 5 minutes

/**
 * GET /api/documents/[id]/signed-url
 *
 * Issues a short-lived (5-minute) signed download URL for the document.
 * Requires document:download permission.
 * The URL can be used in img/iframe without carrying the session cookie.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();
    requirePermission(session, "document:download");

    const actorId = getUserId(session)!;

    const document = await prisma.document.findUnique({
      where: { id: params.id },
      select: { id: true, isArchived: true },
    });

    if (!document || document.isArchived) {
      return NextResponse.json({ success: false, error: "Document not found" }, { status: 404 });
    }

    const token = signDocumentToken(params.id, actorId, TTL_SECONDS);
    const url = `/api/documents/${params.id}/download?token=${encodeURIComponent(token)}`;

    return ok({ url, expiresInSeconds: TTL_SECONDS });
  } catch (err) {
    return handleApiError(err);
  }
}
