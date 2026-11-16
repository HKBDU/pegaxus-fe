import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { dossierService } from "../services";
import { loadComplianceDocument, loadDocumentReview } from "../source";
import {
  invalidateComplianceDocument,
  useComplianceDocument,
} from "../hooks/useComplianceDocument";
import { dossierKeys } from "../hooks/useDossier";
import { getLatestDocumentVersion } from "../lib/document-review";
import type {
  DocumentRequestFormValues,
  DossierOverview,
  DossierRequirement,
} from "../types";
import { RejectDocumentDialog } from "./RejectDocumentDialog";

/**
 * Asks the customer to upload an approved document again, typically after an authority rejected the dossier or asked for more
 * information. The approval is revoked (the requirement goes back to Provided) and the document is then rejected with a
 * re-upload request, which notifies the customer. The other requirements keep their approval.
 */
export function RequestReuploadDialog({
  dossier,
  requirement,
  onClose,
}: {
  dossier: DossierOverview;
  requirement: DossierRequirement;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const dossierId = String(dossier.complianceDossierId);
  const requirementId = String(requirement.dossierRequirementId);
  const documentId = requirement.document
    ? String(requirement.document.complianceDocumentId)
    : null;
  const query = useComplianceDocument(documentId, dossierId, requirementId);
  const document = query.data;
  const latest = document ? getLatestDocumentVersion(document) : undefined;
  const approval = latest?.review?.result === "APPROVED" ? latest.review : null;

  async function refresh() {
    await Promise.all([
      invalidateComplianceDocument(
        client,
        documentId ?? undefined,
        dossierId,
        requirementId,
      ),
      client.invalidateQueries({ queryKey: dossierKeys.overview(dossierId) }),
    ]);
  }

  async function submit(values: DocumentRequestFormValues) {
    if (!document || !latest || !approval || !documentId) return false;
    // 1. Revoke the approval: the requirement goes back to Provided so it can be rejected with a request.
    await dossierService.revokeDocumentReview({
      dossierId,
      requirementId,
      documentId,
      versionId: latest.documentVersionId,
      reviewId: String(approval.documentReviewId),
      review: { status: 3, reason: values.rejectionNote.trim() },
    });
    // 2. Reject with a re-upload request, against the document as it is after the revocation.
    try {
      const current = await loadComplianceDocument(
        documentId,
        undefined,
        dossierId,
        requirementId,
      );
      const version = getLatestDocumentVersion(current);
      if (!version) throw new Error("The document has no version to reject.");
      const result = await loadDocumentReview({
        documentId,
        versionId: version.documentVersionId,
        dossierId,
        requirementId: requirement.dossierRequirementId,
        review: {
          result: "REJECTED",
          ...values,
          versionUploadedAt: version.uploadedAt,
          documentUpdatedAt: current.updatedAt,
        },
      });
      toast.success("The customer was asked to upload this document again.");
      if (result.value.deliveryWarning)
        toast.warning(result.value.deliveryWarning);
      else if (result.value.emailSent === false)
        toast.warning(
          "The request is saved, but email delivery failed. Do not send it again.",
        );
      onClose();
      return true;
    } catch (failure) {
      // The approval is already revoked: the specialist can reject the document from Review Document.
      toast.error(
        "The approval was revoked, but the re-upload request was not created. Open Review Document to reject it.",
      );
      throw failure;
    } finally {
      await refresh();
    }
  }

  if (!document || !latest) {
    return null;
  }
  return (
    <RejectDocumentDialog
      requirement={requirement}
      documentName={document.documentName}
      versionNo={latest.versionNo}
      isPending={query.isFetching}
      canReject={Boolean(approval)}
      onCancel={onClose}
      onSubmit={submit}
    />
  );
}
