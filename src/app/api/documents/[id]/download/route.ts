import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { createReadStream, existsSync } from "fs";
import { Readable } from "stream";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { requirePermission, getUserId, UnauthorizedError } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-response";
import { resolveStoragePath } from "@/lib/secure-file";
import { verifyDocumentToken } from "@/lib/signed-token";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Allow either a valid session OR a valid short-lived signed token
    const tokenParam = req.nextUrl.searchParams.get("token");
    let actorId: string;

    if (tokenParam) {
      const result = verifyDocumentToken(tokenParam);
      if (!result.valid || !result.payload) {
        return NextResponse.json(
          { success: false, error: result.reason === "expired" ? "Download link has expired" : "Invalid download link" },
          { status: 403 }
        );
      }
      // Token's sub must match the document ID in the path
      if (result.payload.sub !== params.id) {
        return NextResponse.json({ success: false, error: "Invalid download link" }, { status: 403 });
      }
      actorId = result.payload.actorId;
    } else {
      const session = await getServerSession(authOptions);
      if (!session) throw new UnauthorizedError();
      requirePermission(session, "document:download");
      actorId = getUserId(session)!;
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: { deposit: { select: { id: true, referenceNumber: true } } },
    });

    if (!document || document.isArchived) {
      return NextResponse.json({ success: false, error: "Document not found" }, { status: 404 });
    }

    const fullPath = resolveStoragePath(document.storagePath);
    if (!existsSync(fullPath)) {
      return NextResponse.json(
        { success: false, error: "File not found in storage" },
        { status: 404 }
      );
    }

    await auditLog({
      action: "DOCUMENT_DOWNLOADED",
      actorId,
      targetType: "Document",
      targetId: document.id,
      ipAddress: ip,
      metadata: {
        depositId: document.depositId,
        fileName: document.originalName,
      },
    });

    // Stream file — serve inline only for safe MIME types
    const INLINE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
    const disposition = INLINE_MIMES.has(document.mimeType)
      ? `inline; filename="${encodeURIComponent(document.originalName)}"`
      : `attachment; filename="${encodeURIComponent(document.originalName)}"`;

    const stream = createReadStream(fullPath);
    const nodeReadable = Readable.from(stream);
    const webStream = new ReadableStream({
      start(controller) {
        nodeReadable.on("data", (chunk) => controller.enqueue(chunk));
        nodeReadable.on("end", () => controller.close());
        nodeReadable.on("error", (err) => controller.error(err));
      },
    });

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": disposition,
        "Content-Length": String(document.sizeBytes),
        "Cache-Control": "no-store, no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
