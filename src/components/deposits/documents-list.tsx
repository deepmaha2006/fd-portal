"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Upload, Download, FileText, Loader2, AlertCircle } from "lucide-react";
import type { Document, DocumentType } from "@prisma/client";

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  FDR_CERTIFICATE: "FDR Certificate",
  RECEIPT: "Receipt",
  BANK_CORRESPONDENCE: "Bank Correspondence",
  CONTRACT: "Contract",
  RENEWAL_DOCUMENT: "Renewal Document",
  RELEASE_DOCUMENT: "Release Document",
  SUPPORTING_EVIDENCE: "Supporting Evidence",
  OTHER: "Other",
};

interface Props {
  depositId: string;
  documents: Document[];
  canUpload: boolean;
  canDownload: boolean;
}

export function DocumentsList({ depositId, documents, canUpload, canDownload }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [docType, setDocType] = useState<DocumentType>("OTHER");

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadError(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentType", docType);

    try {
      const res = await fetch(`/api/deposits/${depositId}/documents`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? "Upload failed");
        return;
      }

      router.refresh();
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="flex items-center justify-between p-5 border-b border-slate-100">
        <h2 className="font-semibold text-slate-900">
          Documents ({documents.length})
        </h2>
        {canUpload && (
          <div className="flex items-center gap-3">
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocumentType)}
              className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(DOCUMENT_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-xs"
            >
              {uploading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Upload size={12} />
              )}
              Upload
            </button>
          </div>
        )}
      </div>

      {uploadError && (
        <div className="mx-5 mt-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          <AlertCircle size={14} />
          {uploadError}
        </div>
      )}

      {documents.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          <FileText size={28} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm">No documents uploaded yet</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center gap-4 p-4 hover:bg-slate-50">
              <FileText size={18} className="text-slate-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{doc.originalName}</p>
                <p className="text-xs text-slate-500">
                  {DOCUMENT_TYPE_LABELS[doc.documentType]} ·{" "}
                  {(doc.sizeBytes / 1024).toFixed(1)} KB ·{" "}
                  {format(doc.uploadedAt, "dd MMM yyyy")}
                </p>
              </div>
              {canDownload && (
                <a
                  href={`/api/documents/${doc.id}/download`}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
                  download
                >
                  <Download size={12} /> Download
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
