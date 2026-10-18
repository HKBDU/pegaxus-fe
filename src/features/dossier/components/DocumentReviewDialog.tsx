import { useId, useState } from "react";
import { ShieldCheck, ShieldX } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  invalidateComplianceDocument,
  useComplianceDocument,
} from "../hooks/useComplianceDocument";
import { useDocumentReview } from "../hooks/useDocumentReview";
import {
  canReviewDocument,
  getLatestDocumentVersion,
  getReviewBlockReason,
  mapDocumentReviewError,
} from "../lib/document-review";
import type {
  ComplianceDocumentDetail,
  DocumentRequestFormValues,
  DocumentReviewError,
  DossierOverview,
  DossierRequirement,
} from "../types";
import { RejectDocumentDialog } from "./RejectDocumentDialog";
import { ApproveDocumentDialog } from "./ApproveDocumentDialog";
import { DocumentReviewContext } from "./DocumentReviewContext";
import { DocumentVersionHistory } from "./DocumentVersionHistory";
import { DossierStatusBadge } from "./DossierStatusBadge";
import { DocumentFilesPreview } from "./DocumentFilesPreview";

function ReviewContent({
  dossier,
  requirement,
  document,
  role,
  onClose,
  onPendingChange,
  onErrorChange,
}: {
  dossier: DossierOverview;
  requirement: DossierRequirement;
  document: ComplianceDocumentDetail;
  role: string | undefined;
  onClose: () => void;
  onPendingChange: (pending: boolean) => void;
  onErrorChange: (error: DocumentReviewError | null) => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [reviewComment, setReviewComment] = useState("");
  const [expiryExceptionReason, setExpiryExceptionReason] = useState("");
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [rejectionOpen, setRejectionOpen] = useState(false);
  const confirmationId = useId();
  const commentId = useId();
  const mutation = useDocumentReview(onPendingChange);
  const latest = getLatestDocumentVersion(document);
  const context = {
    role,
    dossier,
    requirement,
    document,
    expiryExceptionReason,
    today: new Date().toISOString().slice(0, 10),
  };
  const block = getReviewBlockReason(context);
  const canReject = canReviewDocument({ ...context, result: "REJECTED" });
  const canApprove = confirmed && !block && Boolean(latest);

  async function approve() {
    // Recheck current authoritative data; do not trust an earlier checkbox alone.
    if (!canApprove || !latest || mutation.isPending) return;
    onErrorChange(null);
    try {
      const attempt = await mutation.approve({
        documentId: String(document.complianceDocumentId),
        versionId: latest.documentVersionId,
        dossierId: String(dossier.complianceDossierId),
        requirementId: requirement.dossierRequirementId,
        review: {
          result: "APPROVED",
          metadataConfirmed: true,
          versionUploadedAt: latest.uploadedAt,
          documentUpdatedAt: document.updatedAt,
          ...(reviewComment.trim() ? { reviewNote: reviewComment.trim() } : {}),
          ...(expiryExceptionReason.trim()
            ? { expiryExceptionReason: expiryExceptionReason.trim() }
            : {}),
        },
      });
      if (!attempt.started) return;
      toast.success(attempt.value.message);
      setConfirmationOpen(false);
      onClose();
    } catch (failure) {
      const mapped = mapDocumentReviewError(failure);
      onErrorChange(mapped);
      setConfirmationOpen(false);
      setConfirmed(false);
      toast.error(mapped.message);
    }
  }

  async function reject(values: DocumentRequestFormValues) {
    if (
      !canReviewDocument({ ...context, result: "REJECTED" }) ||
      !latest ||
      mutation.isPending
    )
      return false;
    onErrorChange(null);
    try {
      const attempt = await mutation.reject({
        documentId: String(document.complianceDocumentId),
        versionId: latest.documentVersionId,
        dossierId: String(dossier.complianceDossierId),
        requirementId: requirement.dossierRequirementId,
        review: {
          result: "REJECTED",
          ...values,
          versionUploadedAt: latest.uploadedAt,
          documentUpdatedAt: document.updatedAt,
        },
      });
      if (!attempt.started) return false;
      toast.success(attempt.value.message);
      if (attempt.value.value.deliveryWarning)
        toast.warning(attempt.value.value.deliveryWarning);
      else if (attempt.value.value.emailSent === false)
        toast.warning(
          "The revision request is saved, but email delivery failed. Do not submit it again.",
        );
      setRejectionOpen(false);
      onClose();
      return true;
    } catch (failure) {
      const mapped = mapDocumentReviewError(failure);
      onErrorChange(mapped);
      toast.error(mapped.message);
      throw failure;
    }
  }

  return (
    <>
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]">
        <section className="min-w-0 space-y-4" aria-label="Submitted files">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-heading text-lg uppercase">Submitted Files</h3>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-sky-700">
                {latest ? `Version v${latest.versionNo}` : "No version"}
              </span>
              <DossierStatusBadge status={document.status} />
              <span className="text-slate-500">
                {latest?.files.length ?? 0} files attached
              </span>
            </div>
          </div>
          <div className="rounded-[2px] border border-slate-200 bg-white p-3 sm:p-4">
            <p className="mb-3 text-xs text-slate-500">
              Inspect each submitted file before confirming approval. Open File
              remains available if inline preview cannot load.
            </p>
            <DocumentFilesPreview
              key={latest?.documentVersionId}
              files={latest?.files ?? []}
            />
          </div>
          <DocumentVersionHistory versions={document.versions} />
        </section>
        <div className="min-w-0 space-y-4">
          <DocumentReviewContext
            dossier={dossier}
            requirement={requirement}
            document={document}
          />
          <section className="space-y-4 rounded-[2px] border border-slate-200 bg-white p-4">
            <h3 className="font-heading text-base uppercase">
              Review Confirmation
            </h3>
            {block ? (
              <p
                role="alert"
                className="rounded-[2px] border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-700"
              >
                {block.message}
              </p>
            ) : null}
            <div className="flex items-start gap-3">
              <Checkbox
                id={confirmationId}
                checked={confirmed}
                disabled={Boolean(block) || mutation.isPending}
                onCheckedChange={(value) => setConfirmed(value === true)}
                className="mt-0.5 shrink-0"
              />
              <label
                htmlFor={confirmationId}
                className="cursor-pointer text-xs leading-relaxed text-slate-700"
              >
                I have reviewed the submitted files and confirm that the
                document metadata matches the submitted DocumentVersion.
              </label>
            </div>
            <div className="space-y-2">
              <label htmlFor={commentId} className="text-xs font-semibold">
                Review Notes{" "}
                <span className="font-normal text-slate-500">(optional)</span>
              </label>
              <Textarea
                id={commentId}
                value={reviewComment}
                maxLength={2000}
                onChange={(event) => setReviewComment(event.target.value)}
                disabled={mutation.isPending}
                className="min-h-28 rounded-[2px] text-sm"
                placeholder="Record your review findings…"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor={`${commentId}-expiry`}
                className="text-xs font-semibold"
              >
                Expiry Exception Reason (if required)
              </label>
              <Textarea
                id={`${commentId}-expiry`}
                value={expiryExceptionReason}
                onChange={(event) =>
                  setExpiryExceptionReason(event.target.value)
                }
                maxLength={2000}
                disabled={mutation.isPending}
                className="rounded-[2px] text-sm"
              />
              <p className="text-xs text-slate-500">
                The backend may require justification when expiry precedes
                departure. Approval does not mark the dossier ready.
              </p>
            </div>
            <Button
              className="h-auto min-h-9 w-full whitespace-normal rounded-[2px] py-2"
              disabled={!canApprove || mutation.isPending}
              onClick={() => setConfirmationOpen(true)}
            >
              <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
              Approve &amp; Verify Document
            </Button>
            <Button
              variant="outline"
              className="h-auto min-h-9 w-full whitespace-normal rounded-[2px] border-destructive/30 py-2 text-destructive hover:bg-destructive/5 hover:text-destructive"
              disabled={!canReject || mutation.isPending}
              onClick={() => setRejectionOpen(true)}
            >
              <ShieldX aria-hidden="true" className="size-4 shrink-0" /> Reject
              &amp; Request Revision
            </Button>
          </section>
        </div>
      </div>
      <ApproveDocumentDialog
        open={confirmationOpen}
        documentName={document.documentName}
        versionNo={latest?.versionNo ?? 0}
        isPending={mutation.isPending}
        canApprove={canApprove}
        onCancel={() => setConfirmationOpen(false)}
        onConfirm={() => void approve()}
      />
      {rejectionOpen ? (
        <RejectDocumentDialog
          requirement={requirement}
          documentName={document.documentName}
          versionNo={latest?.versionNo ?? 0}
          isPending={mutation.isPending}
          canReject={canReject}
          onCancel={() => setRejectionOpen(false)}
          onSubmit={reject}
        />
      ) : null}
    </>
  );
}

export function DocumentReviewDialog({
  dossier,
  requirement,
  role,
  onClose,
}: {
  dossier: DossierOverview;
  requirement: DossierRequirement;
  role: string | undefined;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<DocumentReviewError | null>(null);
  const client = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const query = useComplianceDocument(
    requirement.document
      ? String(requirement.document.complianceDocumentId)
      : null,
    String(dossier.complianceDossierId),
    String(requirement.dossierRequirementId),
  );
  async function refresh() {
    if (!requirement.document || pending || refreshing) return;
    setRefreshing(true);
    try {
      await invalidateComplianceDocument(
        client,
        String(requirement.document.complianceDocumentId),
        String(dossier.complianceDossierId),
        requirement.dossierRequirementId,
      );
    } finally {
      setRefreshing(false);
    }
  }
  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent
        showCloseButton={!pending}
        onEscapeKeyDown={(event) => pending && event.preventDefault()}
        onPointerDownOutside={(event) => pending && event.preventDefault()}
        className="max-h-[90svh] w-[94vw] max-w-[1440px] overflow-y-auto rounded-[2px] border-slate-200 bg-[#f8f7f4] p-4 sm:max-w-[1440px] sm:p-6"
      >
        <DialogHeader>
          <DialogTitle className="pr-6 font-heading text-2xl uppercase text-primary">
            Document Review Panel
          </DialogTitle>
          <DialogDescription>
            Inspect the submitted version and verify the document against its
            requirement.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            disabled={pending || refreshing || query.isFetching}
            onClick={() => void refresh()}
            className="rounded-[2px]"
          >
            {refreshing || query.isFetching
              ? "Refreshing…"
              : "Refresh Review Data"}
          </Button>
        </div>
        {error ? (
          <div
            role="alert"
            className="rounded-[2px] border border-red-200 bg-red-50 p-3 text-xs text-red-700"
          >
            <p>{error.message}</p>
            <details className="mt-2">
              <summary>Technical details</summary>
              <p className="mt-1 break-words">
                {error.code}: {error.backendMessage}
              </p>
            </details>
          </div>
        ) : null}
        {query.isPending ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Loading document…
          </p>
        ) : query.isError || !query.data ? (
          <div role="alert" className="space-y-3 text-sm text-red-700">
            <p>{mapDocumentReviewError(query.error).message}</p>
            <Button variant="outline" onClick={() => void query.refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <ReviewContent
            key={`${query.data.complianceDocumentId}-${query.data.versions[0]?.documentVersionId}-${query.data.updatedAt}`}
            dossier={dossier}
            requirement={requirement}
            document={query.data}
            role={role}
            onClose={onClose}
            onPendingChange={setPending}
            onErrorChange={setError}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
