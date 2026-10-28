export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { requirePermission, getUserId, UnauthorizedError } from "@/lib/permissions";
import { ok, created, handleApiError } from "@/lib/api-response";
import { validateUpload, storeFile } from "@/lib/secure-file";
import type { DocumentType } from "@prisma/client";

const DOCUMENT_TYPES: DocumentType[] = [
  "FDR_CERTIFICATE",
  "RECEIPT",
  "BANK_CORRESPONDENCE",
  "CONTRACT",
  "RENEWAL_DOCUMENT",
  "RELEASE_DOCUMENT",
  "SUPPORTING_EVIDENCE",
  "OTHER",
];

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();
    requirePermission(session, "document:download");

    const deposit = await prisma.deposit.findUnique({ where: { id: params.id } });
    if (!deposit) {
      return NextResponse.json({ success: false, error: "Deposit not found" }, { status: 404 });
    }

    const documents = await prisma.document.findMany({
      where: { depositId: params.id, isArchived: false },
      orderBy: { uploadedAt: "desc" },
      select: {
        id: true,
        documentType: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        uploadedAt: true,
        checksumSha256: true,
      },
    });

    return ok(documents);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();
    requirePermission(session, "document:upload");

    const actorId = getUserId(session)!;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    const deposit = await prisma.deposit.findUnique({ where: { id: params.id } });
    if (!deposit) {
      return NextResponse.json({ success: false, error: "Deposit not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const documentTypeRaw = formData.get("documentType") as string | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 422 });
    }

    // Validate file type and size
    const validationError = validateUpload(file);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError.message },
        { status: 422 }
      );
    }

    // Validate document type
    const documentType: DocumentType =
      DOCUMENT_TYPES.includes(documentTypeRaw as DocumentType)
        ? (documentTypeRaw as DocumentType)
        : "OTHER";

    // Sanitize original filename — store only extension + base display name
    const safeName = file.name
      .replace(/[^a-zA-Z0-9._\- ]/g, "_")
      .substring(0, 255);

    const buffer = Buffer.from(await file.arrayBuffer());

    const stored = await storeFile(buffer, safeName, file.type, params.id);

    const doc = await prisma.document.create({
      data: {
        depositId: params.id,
        documentType,
        originalName: safeName,
        storagePath: stored.storagePath,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        checksumSha256: stored.checksumSha256,
        uploadedById: actorId,
      },
    });

    await auditLog({
      action: "DOCUMENT_UPLOADED",
      actorId,
      targetType: "Document",
      targetId: doc.id,
      ipAddress: ip,
      metadata: {
        depositId: params.id,
        fileName: safeName,
        documentType,
        sizeBytes: stored.sizeBytes,
      },
    });

    return created({
      id: doc.id,
      documentType: doc.documentType,
      originalName: doc.originalName,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      uploadedAt: doc.uploadedAt,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
