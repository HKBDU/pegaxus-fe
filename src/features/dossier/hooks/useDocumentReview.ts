import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createRequestAttemptGuard } from "@/shared/hooks/request-attempt-guard";
import { mapDocumentReviewError } from "../lib/document-review";
import { loadApproveDocument } from "../source";
import type { ApproveDocumentInput } from "../types";
import { invalidateComplianceDocument } from "./useComplianceDocument";

export function useDocumentReview(onPendingChange?: (pending: boolean) => void) {
  const client = useQueryClient();
  const guard = useRef(createRequestAttemptGuard((state) => onPendingChange?.(state.isRunning)));
  const mutation = useMutation({
    mutationFn: (input: ApproveDocumentInput) => loadApproveDocument(input),
    retry: false,
    onSuccess: (_response, input) => invalidateComplianceDocument(client, input.documentId, input.dossierId),
    onError: (error, input) => {
      if (mapDocumentReviewError(error).refresh) return invalidateComplianceDocument(client, input.documentId, input.dossierId);
    },
  });
  return {
    ...mutation,
    approve: (input: ApproveDocumentInput) => {
      guard.current.reset();
      return guard.current.run(() => mutation.mutateAsync(input));
    },
  };
}
