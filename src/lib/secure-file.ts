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

// Magic bytes for common file types (simplified check)
const FILE_SIGNATURES: Array<{ bytes: number[]; mime: string }> = [
  { bytes: [0x25, 0x50, 0x44, 0x46], mime: "application/pdf" }, // %PDF
  { bytes: [0xff, 0xd8, 0xff], mime: "image/jpeg" },
  { bytes: [0x89, 0x50, 0x4e, 0x47], mime: "image/png" },
  { bytes: [0x50, 0x4b, 0x03, 0x04], mime: "application/zip" }, // docx/xlsx
  { bytes: [0xd0, 0xcf, 0x11, 0xe0], mime: "application/msword" }, // DOC/XLS
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
  for (const sig of FILE_SIGNATURES) {
    if (sig.bytes.every((b, i) => buffer[i] === b)) {
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
  // For Office formats (docx/xlsx) the magic is ZIP — allow it
  const isMimeOk =
    detectedMime === declaredMime ||
    (detectedMime === "application/zip" &&
      (declaredMime.includes("openxmlformats") || declaredMime.includes("msword"))) ||
    detectedMime === null; // fall through if unknown

  if (!isMimeOk && detectedMime !== null) {
    throw new Error("File content does not match its declared type.");
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
