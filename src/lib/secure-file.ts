import { createHash } from "crypto";
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from "fs";
import { join, resolve, extname } from "path";
import { v4 as uuidv4 } from "uuid";
import { env } from "@/lib/env";

// ─── Allowed MIME types (allowlist, not blocklist) ────────────────────────────

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/tiff",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".tiff",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
]);

// Magic bytes for all allowed file types
const FILE_SIGNATURES: Array<{
  bytes: number[];
  offset?: number;
  mime: string;
}> = [
  { bytes: [0x25, 0x50, 0x44, 0x46], mime: "application/pdf" },       // %PDF
  { bytes: [0xff, 0xd8, 0xff],        mime: "image/jpeg" },
  { bytes: [0x89, 0x50, 0x4e, 0x47], mime: "image/png" },
  // RIFF header → check "WEBP" at offset 8
  { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0, mime: "image/webp_riff" },
  { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8, mime: "image/webp" },
  // TIFF: little-endian (II*.) and big-endian (MM.*)
  { bytes: [0x49, 0x49, 0x2a, 0x00], mime: "image/tiff" },
  { bytes: [0x4d, 0x4d, 0x00, 0x2a], mime: "image/tiff" },
  { bytes: [0x50, 0x4b, 0x03, 0x04], mime: "application/zip" },        // docx/xlsx
  { bytes: [0xd0, 0xcf, 0x11, 0xe0], mime: "application/msword" },     // DOC/XLS
];

export interface StoreFileResult {
  storagePath: string;
  checksumSha256: string;
  sizeBytes: number;
  mimeType: string;
}

export interface FileValidationError {
  field: string;
  message: string;
}

function detectMimeFromBytes(buffer: Buffer): string | null {
  // WEBP requires two separate checks (RIFF header + WEBP marker at offset 8)
  const isWebp =
    FILE_SIGNATURES.find(
      (s) => s.mime === "image/webp_riff" && s.bytes.every((b, i) => buffer[i] === b)
    ) &&
    FILE_SIGNATURES.find(
      (s) => s.mime === "image/webp" && s.bytes.every((b, i) => buffer[(s.offset ?? 0) + i] === b)
    );
  if (isWebp) return "image/webp";

  for (const sig of FILE_SIGNATURES) {
    if (sig.mime === "image/webp_riff" || sig.mime === "image/webp") continue;
    const off = sig.offset ?? 0;
    if (sig.bytes.every((b, i) => buffer[off + i] === b)) {
      return sig.mime;
    }
  }
  return null;
}

export function validateUpload(
  file: File | { name: string; type: string; size: number; arrayBuffer(): Promise<ArrayBuffer> },
  maxBytes = env.UPLOAD_MAX_SIZE_MB * 1024 * 1024
): FileValidationError | null {
  // Extension check
  const ext = extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { field: "file", message: `File type not allowed: ${ext}` };
  }

  // Declared MIME check
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { field: "file", message: "MIME type not permitted" };
  }

  // Size check
  if (file.size > maxBytes) {
    return {
      field: "file",
      message: `File too large. Maximum size is ${env.UPLOAD_MAX_SIZE_MB}MB`,
    };
  }

  return null;
}

export async function storeFile(
  buffer: Buffer,
  originalName: string,
  declaredMime: string,
  depositId: string
): Promise<StoreFileResult> {
  // Verify magic bytes match declared MIME
  const detectedMime = detectMimeFromBytes(buffer);
  // All allowed MIME types now have known signatures; "application/zip" covers docx/xlsx
  const isMimeOk =
    detectedMime === declaredMime ||
    (detectedMime === "application/zip" &&
      (declaredMime.includes("openxmlformats") || declaredMime.includes("msword")));

  if (!isMimeOk) {
    throw new Error(
      detectedMime === null
        ? "Unrecognized file format. Only PDF, JPEG, PNG, WEBP, TIFF, DOC, DOCX, XLS, XLSX are accepted."
        : "File content does not match its declared type."
    );
  }

  // Generate opaque server-side path — never use original filename
  const storageName = `${uuidv4()}${extname(originalName).toLowerCase()}`;
  const depositDir = join(resolve(env.UPLOAD_DIR), depositId);

  if (!existsSync(depositDir)) {
    mkdirSync(depositDir, { recursive: true });
  }

  const storagePath = join(depositDir, storageName);
  writeFileSync(storagePath, buffer);

  const checksumSha256 = createHash("sha256").update(buffer).digest("hex");

  return {
    storagePath: join(depositId, storageName), // relative, opaque
    checksumSha256,
    sizeBytes: buffer.length,
    mimeType: declaredMime,
  };
}

export function deleteStoredFile(storagePath: string): void {
  const fullPath = join(resolve(env.UPLOAD_DIR), storagePath);
  // Prevent path traversal: must be within uploads dir
  const uploadsDir = resolve(env.UPLOAD_DIR);
  if (!fullPath.startsWith(uploadsDir)) {
    throw new Error("Path traversal detected");
  }
  if (existsSync(fullPath)) {
    unlinkSync(fullPath);
  }
}

export function resolveStoragePath(storagePath: string): string {
  const fullPath = join(resolve(env.UPLOAD_DIR), storagePath);
  const uploadsDir = resolve(env.UPLOAD_DIR);
  if (!fullPath.startsWith(uploadsDir)) {
    throw new Error("Path traversal detected");
  }
  return fullPath;
}
