import { FileText, History } from "lucide-react";
import { useState } from "react";
import { formatBookingDate } from "@/features/booking/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { useComplianceDocument } from "../hooks/useComplianceDocument";
import type { DocumentVersion } from "../types";
import { DossierStatusBadge } from "./DossierStatusBadge";
import { Button } from "@/shared/components/ui/button";
import { DocumentRequestAlert } from "./DocumentRequestAlert";
import { DocumentFilesPreview } from "./DocumentFilesPreview";

function VersionFiles({ files }: { files: DocumentVersion["files"] }) {
  const [open, setOpen] = useState(false);
  return <div className="mt-3 space-y-3">
    <Button type="button" variant="outline" size="sm" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="rounded-[2px]">
      {open ? "Hide version files" : "Inspect version files"}
    </Button>
    {open ? <DocumentFilesPreview files={files} /> : null}
  </div>;
}

export function DocumentVersionHistory({ versions }: { versions: DocumentVersion[] }) {
  return (
    <section aria-label="Document version history" className="space-y-3">
      <h3 className="flex items-center gap-2 font-heading text-sm font-bold uppercase text-slate-900">
        <History className="size-4 text-primary" /> Version History
      </h3>
      {!versions.length ? <p className="text-xs text-slate-500">No versions are available.</p> : null}
      {versions.map((version) => (
        <article key={version.documentVersionId} className="rounded-[2px] border border-slate-200 bg-white p-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong className="font-heading text-sm uppercase text-slate-900">Version v{version.versionNo}</strong>
            <span className="text-slate-500">{formatBookingDate(version.uploadedAt)}</span>
          </div>
          <p className="mt-1 text-slate-500">{version.files.length} {version.files.length === 1 ? "file" : "files"}</p>
          <ul className="mt-2 space-y-1">
            {version.files.map((file) => (
              <li key={`${file.sortOrder}-${file.fileName}`} className="flex items-center gap-2 break-all text-slate-700">
                <FileText className="size-3.5 shrink-0 text-primary" />{file.fileName}
              </li>
            ))}
          </ul>
          {version.files.length ? <VersionFiles files={version.files} /> : null}
          {version.uploadNote ? <p className="mt-2 text-slate-600"><strong>Upload Note:</strong> {version.uploadNote}</p> : null}
          {version.review ? (
            <div className="mt-3 border-t border-slate-200 pt-2 text-slate-600">
              <p><strong>Review Result:</strong> {version.review.result}</p>
              <p><strong>Reviewer:</strong> {version.review.reviewedBy.fullName}</p>
              <p><strong>Reviewed At:</strong> {formatBookingDate(version.review.reviewedAt)}</p>
              {version.review.reviewComment ? <p><strong>Review Comment:</strong> {version.review.reviewComment}</p> : null}
            </div>
          ) : <p className="mt-2 text-sky-700">Pending review</p>}
        </article>
      ))}
    </section>
  );
}

export function DocumentDetailsDialog({ documentId, onClose, onUpdate, view = "details" }: { documentId: string | null; onClose: () => void; onUpdate?: () => void; view?: "details" | "request" | "history" }) {
  const query = useComplianceDocument(documentId);
  const document = query.data;
  return (
    <Dialog open={Boolean(documentId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90svh] w-[min(100%-1.5rem,720px)] max-w-none overflow-y-auto rounded-[2px] border-slate-200 bg-[#f8f7f4] sm:max-w-none">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl uppercase text-primary">{view === "request" ? "Document Request" : view === "history" ? "Document Version / Review History" : "Document Details"}</DialogTitle>
          <DialogDescription>Current document information and version history.</DialogDescription>
        </DialogHeader>
        {query.isPending ? <p className="text-sm text-slate-500">Loading document details...</p> :
          query.isError || !document ? <p role="alert" className="text-sm text-red-700">Could not load document details.</p> : (
          <div className="space-y-4">
            {document.openRequest ? <DocumentRequestAlert request={document.openRequest}
              action={document.status === "REJECTED" && onUpdate ? <Button type="button" size="sm" className="rounded-[2px]" onClick={onUpdate}>Update Document</Button> : undefined} /> : null}
            {view === "request" && !document.openRequest ? <p role="status" className="rounded-[2px] border border-border bg-white p-4 text-sm text-muted-foreground">There is no open document request. It may already have been fulfilled by a newer upload.</p> : null}
            <dl className="grid gap-3 rounded-[2px] border border-slate-200 bg-white p-4 text-xs sm:grid-cols-2">
              <div><dt className="text-slate-500">Document</dt><dd className="font-semibold">{document.documentName}</dd></div>
              <div><dt className="text-slate-500">Document Code</dt><dd>{document.documentCode}</dd></div>
              <div><dt className="text-slate-500">Status</dt><dd><DossierStatusBadge status={document.status} /></dd></div>
              <div><dt className="text-slate-500">Document Number</dt><dd>{document.documentNumber ?? "—"}</dd></div>
              <div><dt className="text-slate-500">Issuing Authority</dt><dd>{document.issuingAuthority ?? "—"}</dd></div>
              <div><dt className="text-slate-500">Expiry Date</dt><dd>{document.expiryDate ? formatBookingDate(document.expiryDate) : "—"}</dd></div>
            </dl>
            <DocumentVersionHistory versions={document.versions} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
