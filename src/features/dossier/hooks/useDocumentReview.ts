import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createRequestAttemptGuard } from "@/shared/hooks/request-attempt-guard";
import { mapDocumentReviewError } from "../lib/document-review";
import { loadDocumentReview } from "../source";
import type { ApproveDocumentInput, DocumentReviewInput, RejectDocumentReview, RevokeDocumentReviewInput } from "../types";
import { invalidateComplianceDocument } from "./useComplianceDocument";
import { dossierService } from "../services";

export function useDocumentReview(onPendingChange?: (pending: boolean) => void) {
  const client = useQueryClient();
  const guard = useRef(createRequestAttemptGuard((state) => onPendingChange?.(state.isRunning)));
  const mutation = useMutation({
    mutationFn: (input: DocumentReviewInput | RevokeDocumentReviewInput) => "reviewId" in input ? dossierService.revokeDocumentReview(input) : loadDocumentReview(input),
    retry: false,
    onSuccess: (_response, input) => invalidateComplianceDocument(client, input.documentId, input.dossierId, input.requirementId),
    onError: (error, input) => {
      if (mapDocumentReviewError(error).refresh || (error as { response?: { status?: number } }).response?.status === 409) return invalidateComplianceDocument(client, input.documentId, input.dossierId, input.requirementId);
    },
  });
  const review = (input: DocumentReviewInput | RevokeDocumentReviewInput) => {
    guard.current.reset();
    return guard.current.run(() => mutation.mutateAsync(input));
  };
  return {
    ...mutation,
    approve: (input: ApproveDocumentInput) => review(input),
    reject: (input: Omit<DocumentReviewInput, "review"> & { review: RejectDocumentReview }) => review(input),
    revoke: (input: RevokeDocumentReviewInput) => review(input),
  };
}
