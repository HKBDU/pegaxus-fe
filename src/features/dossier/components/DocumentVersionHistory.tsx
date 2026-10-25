import { FileText, History } from "lucide-react";
import { useState } from "react";
import { formatBookingDate } from "@/features/booking/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  useComplianceDocument,
  useDocumentVersions,
} from "../hooks/useComplianceDocument";
import type { DocumentVersion, DossierOverview } from "../types";
import { DossierStatusBadge } from "./DossierStatusBadge";
import { Button } from "@/shared/components/ui/button";
import { DocumentRequestAlert } from "./DocumentRequestAlert";
import { DocumentFilesPreview } from "./DocumentFilesPreview";
import { DocumentRequestComments } from "./DocumentRequestComments";
import { RevokeDocumentReviewDialog } from "./RevokeDocumentReviewDialog";

// INVALID FEATURE: Flow 2 has no revoke-review endpoint. Keep legacy code for
// audit/reference, but this flag must remain false until the contract changes.
const REVOKE_REVIEW_FEATURE_ENABLED = false;

function VersionFiles({ files }: { files: DocumentVersion["files"] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 space-y-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="rounded-[2px]"
      >
        {open ? "Hide version files" : "Inspect version files"}
      </Button>
      {open ? <DocumentFilesPreview files={files} /> : null}
    </div>
  );
}

export function DocumentVersionHistory({
  versions,
  expandLatestReview = false,
}: {
  versions: DocumentVersion[];
  expandLatestReview?: boolean;
}) {
  return (
    <section
      aria-label="Document version history"
      className="min-w-0 space-y-3"
    >
      <h3 className="flex items-center gap-2 font-heading text-sm font-bold uppercase text-slate-900">
        <History className="size-4 text-primary" /> Version History
      </h3>
      {!versions.length ? (
        <p className="text-xs text-slate-500">No versions are available.</p>
      ) : null}
      {versions.map((version) => (
        <article
          key={version.documentVersionId}
          className="min-w-0 rounded-[2px] border border-slate-200 bg-white p-3 text-xs [overflow-wrap:anywhere]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong className="font-heading text-sm uppercase text-slate-900">
              Version v{version.versionNo}
            </strong>
            <span className="text-slate-500">
              {formatBookingDate(version.uploadedAt)}
            </span>
          </div>
          <p className="mt-1 text-slate-500">
            {version.files.length}{" "}
            {version.files.length === 1 ? "file" : "files"}
          </p>
          <ul className="mt-2 space-y-1">
            {version.files.map((file) => (
              <li
                key={`${file.sortOrder}-${file.fileName}`}
                className="flex min-w-0 items-start gap-2 text-slate-700"
              >
                <FileText className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  {file.fileName}
                </span>
              </li>
            ))}
          </ul>
          {version.files.length ? (
            <VersionFiles
              key={`${version.documentVersionId}-${version.uploadedAt}`}
              files={version.files}
            />
          ) : null}
          {version.uploadNote ? (
            <p className="mt-2 text-slate-600">
              <strong>Upload Note:</strong> {version.uploadNote}
            </p>
          ) : null}
          {version.review ? (
            <details
              open={expandLatestReview && version === versions[0]}
              className="mt-3 min-w-0 border-t border-slate-200 pt-2"
            >
              <summary className="cursor-pointer rounded-[2px] font-semibold text-slate-700 focus-visible:outline-2 focus-visible:outline-ring">
                Review history · {version.review.result}
              </summary>
              {(version.reviews ?? [version.review]).map((review) => (
                <div
                  key={review.documentReviewId}
                  className="mt-3 border-t border-slate-200 pt-2 text-slate-600"
                >
                  <p>
                    <strong>Review Result:</strong> {review.result}
                  </p>
                  <p>
                    <strong>Reviewer:</strong>{" "}
                    {review.reviewedBy.fullName || "Transport Specialist"}
                  </p>
                  <p>
                    <strong>Reviewed At:</strong>{" "}
                    {formatBookingDate(review.reviewedAt)}
                  </p>
                  {review.reviewComment ? (
                    <p>
                      <strong>Review Comment:</strong> {review.reviewComment}
                    </p>
                  ) : null}
                </div>
              ))}
            </details>
          ) : (
            <p className="mt-2 text-sky-700">Pending review</p>
          )}
        </article>
      ))}
    </section>
  );
}

export function DocumentDetailsDialog({
  documentId,
  dossierId,
  requirementId,
  dossier,
  role,
  onClose,
  onUpdate,
  view = "details",
}: {
  documentId: string | null;
  dossierId: string;
  requirementId: string;
  dossier: DossierOverview;
  role?: string;
  onClose: () => void;
  onUpdate?: () => void;
  view?: "details" | "request" | "history";
}) {
  const query = useComplianceDocument(
    documentId,
    documentId ? dossierId : undefined,
    documentId ? requirementId : undefined,
  );
  const history = useDocumentVersions(
    dossierId,
    requirementId,
    Boolean(documentId),
  );
  const [revokeOpen, setRevokeOpen] = useState(false);
  const document = query.data;
  const close = () => {
    setRevokeOpen(false);
    onClose();
  };
  return (
    <Dialog
      open={Boolean(documentId)}
      onOpenChange={(open) => !open && close()}
    >
      <DialogContent className="max-h-[90svh] w-[min(100%-1.5rem,720px)] min-w-0 max-w-none overflow-y-auto rounded-[2px] border-slate-200 bg-[#f8f7f4] [overflow-wrap:anywhere] sm:max-w-none">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl uppercase text-primary">
            {view === "request"
              ? "Document Request"
              : view === "history"
                ? "Document Version / Review History"
                : "Document Details"}
          </DialogTitle>
          <DialogDescription>
            Current document information and version history.
          </DialogDescription>
        </DialogHeader>
        {query.isPending ? (
          <p className="text-sm text-slate-500">Loading document details...</p>
        ) : query.isError || !document ? (
          <p role="alert" className="text-sm text-red-700">
            Could not load document details.
          </p>
        ) : (
          <div className="min-w-0 space-y-4">
            {document.openRequest ? (
              <DocumentRequestAlert
                request={document.openRequest}
                action={
                  document.status === "REJECTED" && onUpdate ? (
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-[2px]"
                      onClick={onUpdate}
                    >
                      Update Document
                    </Button>
                  ) : undefined
                }
              />
            ) : null}
            {view === "request" && !document.openRequest ? (
              <p
                role="status"
                className="rounded-[2px] border border-border bg-white p-4 text-sm text-muted-foreground"
              >
                There is no open document request. It may already have been
                fulfilled by a newer upload.
              </p>
            ) : null}
            <dl className="grid gap-3 rounded-[2px] border border-slate-200 bg-white p-4 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Document</dt>
                <dd className="font-semibold">{document.documentName}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Document Code</dt>
                <dd>{document.documentCode}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd>
                  <DossierStatusBadge status={document.status} />
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Document Number</dt>
                <dd>{document.documentNumber ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Issuing Authority</dt>
                <dd>{document.issuingAuthority ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Expiry Date</dt>
                <dd>
                  {document.expiryDate
                    ? formatBookingDate(document.expiryDate)
                    : "—"}
                </dd>
              </div>
            </dl>
            {history.isError ? (
              <div role="alert" className="text-xs">
                <p>Could not load version history.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void history.refetch()}
                >
                  Retry history
                </Button>
              </div>
            ) : (
              <DocumentVersionHistory
                versions={history.data ?? document.versions}
                expandLatestReview={
                  document.status === "REJECTED" && !document.openRequest
                }
              />
            )}
            {(document.documentRequests ?? []).map((request) => (
              <DocumentRequestComments
                key={request.documentRequestId}
                dossierId={dossierId}
                requirementId={requirementId}
                request={request}
                showRequestSummary={
                  String(request.documentRequestId) !==
                  String(document.openRequest?.documentRequestId)
                }
                canReadComments={
                  role === "CUSTOMER" || role === "TRANSPORT_SPECIALIST"
                }
                canComment={
                  (role === "CUSTOMER" || role === "TRANSPORT_SPECIALIST") &&
                  request.status === "OPEN"
                }
              />
            ))}
            {REVOKE_REVIEW_FEATURE_ENABLED &&
            role === "TRANSPORT_SPECIALIST" &&
            !dossier.writeLocked &&
            ["IN_PREPARATION", "REJECTED", "READY_FOR_SUBMISSION"].includes(
              dossier.status,
            ) &&
            document.status === "APPROVED" &&
            document.versions[0]?.review?.result === "APPROVED" ? (
              <Button variant="destructive" onClick={() => setRevokeOpen(true)}>
                Revoke Approval
              </Button>
            ) : null}
            {REVOKE_REVIEW_FEATURE_ENABLED && revokeOpen ? (
              <RevokeDocumentReviewDialog
                dossierId={dossierId}
                requirementId={requirementId}
                document={document}
                onClose={() => {
                  setRevokeOpen(false);
                  onClose();
                }}
              />
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
