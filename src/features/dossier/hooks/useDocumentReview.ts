import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createRequestAttemptGuard } from "@/shared/hooks/request-attempt-guard";
import { mapDocumentReviewError } from "../lib/document-review";
import { loadDocumentReview } from "../source";
import type {
  ApproveDocumentInput,
  DocumentReviewInput,
  RejectDocumentReview,
  RevokeDocumentReviewInput,
} from "../types";
import { invalidateComplianceDocument } from "./useComplianceDocument";
import { dossierService } from "../services";

export function useDocumentReview(
  onPendingChange?: (pending: boolean) => void,
) {
  const client = useQueryClient();
  const outcomeUnknown = useRef(false);
  const guard = useRef(
    createRequestAttemptGuard((state) => onPendingChange?.(state.isRunning)),
  );
  const mutation = useMutation({
    // INVALID / DISABLED legacy branch: revoke review is not in the Flow 2 contract.
    mutationFn: (input: DocumentReviewInput | RevokeDocumentReviewInput) =>
      "reviewId" in input
        ? dossierService.revokeDocumentReview(input)
        : loadDocumentReview(input),
    retry: false,
    onSuccess: (_response, input) =>
      invalidateComplianceDocument(
        client,
        input.documentId,
        input.dossierId,
        input.requirementId,
      ),
    onError: (error, input) => {
      const mapped = mapDocumentReviewError(error);
      if (mapped.outcomeUnknown) outcomeUnknown.current = true;
      if (
        mapped.refresh ||
        (error as { response?: { status?: number } }).response?.status === 409
      )
        return invalidateComplianceDocument(
          client,
          input.documentId,
          input.dossierId,
          input.requirementId,
        );
    },
  });
  const review = (input: DocumentReviewInput | RevokeDocumentReviewInput) => {
    if (outcomeUnknown.current)
      return Promise.resolve({ started: false } as const);
    guard.current.reset();
    return guard.current.run(() => mutation.mutateAsync(input));
  };
  return {
    ...mutation,
    approve: (input: ApproveDocumentInput) => review(input),
    reject: (
      input: Omit<DocumentReviewInput, "review"> & {
        review: RejectDocumentReview;
      },
    ) => review(input),
    revoke: (input: RevokeDocumentReviewInput) => review(input),
  };
}
